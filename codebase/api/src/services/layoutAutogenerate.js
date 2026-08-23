/**
 * Rules-based fixture generation shared by Smart Generate and floor-plan import build.
 */
import { countGondolaUnits } from "./shelfFaces.js";
import { entityInsideLayout } from "./polygonContainment.js";
import { packAislesAndShelves } from "./layoutPacker.js";
import { finalizeAisleShelfBinding } from "./aisleBinding.js";
import { guaranteeEveryShelfHasAisle, enforceAisleMinimums, pruneOverlappingAisles } from "./aisleCoverage.js";
import { finalizeAisleLabeling } from "./aisleLabeling.js";
import { assignCategoryMix } from "./categoryMixPacker.js";
import { applyFixtureTypesToShelves } from "./categoryFixtureDefaults.js";
import { listCategoriesForLayout, resolveCategoryId } from "./categoryTree.js";
import { warehouseLayoutMode, WAREHOUSE_MIN_AISLE_M } from "./warehouseLayout.js";

export function clearArrangementAcceptance(layout) {
  layout.arrangementAcceptedAt = null;
  layout.arrangementAcceptedBy = null;
}

/**
 * Pack aisles/shelves into layout from store polygon. Mutates layout in place.
 * @returns {{ skippedOutsideCount: number, categoryMapped: boolean, gondolaUnits: number }}
 */
export function autogenerateLayoutFixtures(layout, body, { getConfig, listCategories }) {
  const config = getConfig(layout.vertical);
  const templates = config.fixtureTemplates || [];
  const warehouseMode = warehouseLayoutMode(layout);
  const preferredType = warehouseMode
    ? body.shelfTemplate?.type || "pallet_rack"
    : body.shelfTemplate?.type || (layout.vertical === "hypermarket" ? "gondola" : "shelf");
  const shelfTmpl =
    templates.find((t) => t.type === preferredType) ||
    templates.find((t) => (warehouseMode ? t.type === "pallet_rack" : t.type === "shelf")) ||
    templates[0] ||
    {};
  const configMinAisle = warehouseMode
    ? Math.max(WAREHOUSE_MIN_AISLE_M, Number(config.minAisleWidthMeters) || WAREHOUSE_MIN_AISLE_M)
    : Math.max(0.9, Number(config.minAisleWidthMeters) || 1.2);
  const requestedAisle =
    body.minAisleWidthMeters != null && body.minAisleWidthMeters !== ""
      ? Number(body.minAisleWidthMeters)
      : configMinAisle;
  const minAisle = Math.max(
    configMinAisle,
    Number.isFinite(requestedAisle) ? requestedAisle : configMinAisle
  );

  const packed = packAislesAndShelves(layout, {
    warehouseMode,
    orientation: body.orientation || (warehouseMode ? "vertical" : "auto"),
    minAisleWidthMeters: minAisle,
    crossAisles: body.crossAisles === true,
    compactMode: body.compactMode !== false,
    fillRemaining: body.fillRemaining !== false,
    fillTemplates: templates.map((t) => ({
      type: t.type,
      defaultWidthMeters: t.defaultWidthMeters,
      defaultDepthMeters: t.defaultDepthMeters,
      defaultLevels: t.defaultLevels,
    })),
    shelfTemplate: {
      type: body.shelfTemplate?.type ?? shelfTmpl.type ?? preferredType,
      usableWidthMeters: body.shelfTemplate?.usableWidthMeters ?? shelfTmpl.defaultWidthMeters ?? 1.2,
      depthMeters: body.shelfTemplate?.depthMeters ?? shelfTmpl.defaultDepthMeters ?? 0.6,
      heightMeters: body.shelfTemplate?.heightMeters ?? shelfTmpl.defaultHeightMeters ?? (warehouseMode ? 6 : 2),
      defaultLevels: body.shelfTemplate?.defaultLevels ?? shelfTmpl.defaultLevels,
    },
  });

  layout.aisles = packed.aisles;
  layout.aisleMappings = [];

  const categoryMix = Array.isArray(body.categoryMix) ? body.categoryMix : [];
  const categories = listCategoriesForLayout(layout.vertical, (v) =>
    listCategories().filter((c) => c.vertical === v)
  );

  if (categoryMix.length > 0) {
    const totalPct = categoryMix.reduce((s, m) => s + Number(m.percent || 0), 0);
    if (Math.abs(totalPct - 100) > 0.01) {
      const err = new Error("category_mix_invalid");
      err.code = "category_mix_invalid";
      throw err;
    }
    const resolvedMix = categoryMix.map((row) => ({
      ...row,
      categoryId: resolveCategoryId(row.categoryId, categories) || row.categoryId,
    }));
    const assigned = assignCategoryMix(packed.shelves, resolvedMix, categories);
    layout.shelves = applyFixtureTypesToShelves(assigned.shelves, resolvedMix, categories, config);
    layout.shelfMappings = assigned.shelfMappings;
  } else {
    layout.shelves = packed.shelves;
    layout.shelfMappings = [];
  }

  let droppedOutside = 0;
  layout.aisles = (layout.aisles || []).filter((a) => {
    if (entityInsideLayout(a, "aisle", layout)) return true;
    droppedOutside += 1;
    return false;
  });
  layout.shelves = (layout.shelves || []).filter((s) => {
    if (entityInsideLayout(s, "shelf", layout)) return true;
    droppedOutside += 1;
    return false;
  });

  const bound = finalizeAisleShelfBinding(layout.shelves, layout.aisles, layout);
  layout.shelves = bound.shelves;
  layout.aisles = bound.aisles;
  const covered = guaranteeEveryShelfHasAisle(layout.shelves, layout.aisles, layout, {
    preferredMinAisle: minAisle,
    strictMinAisle: warehouseMode || minAisle >= 0.9,
    skipSplit: warehouseMode,
    skipCreate: warehouseMode,
  });
  layout.shelves = covered.shelves;
  layout.aisles = enforceAisleMinimums(covered.aisles, layout.shelves, layout, minAisle, {
    strict: warehouseMode,
  });
  if (warehouseMode) {
    layout.aisles = pruneOverlappingAisles(layout.aisles, layout);
  }
  // Drop anything pushed outside the fixture polygon by merge / widen / split.
  layout.aisles = (layout.aisles || []).filter((a) => {
    if (entityInsideLayout(a, "aisle", layout)) return true;
    droppedOutside += 1;
    return false;
  });
  layout.shelves = (layout.shelves || []).filter((s) => {
    if (entityInsideLayout(s, "shelf", layout)) return true;
    droppedOutside += 1;
    return false;
  });
  ({ shelves: layout.shelves, aisles: layout.aisles } = finalizeAisleShelfBinding(
    layout.shelves,
    layout.aisles,
    layout
  ));
  ({ shelves: layout.shelves, aisles: layout.aisles } = finalizeAisleLabeling(
    layout.shelves,
    layout.aisles,
    layout
  ));

  layout.fixtures = [];
  layout.mappings = [];
  clearArrangementAcceptance(layout);

  return {
    skippedOutsideCount: (packed.skippedOutsideCount ?? 0) + droppedOutside,
    categoryMapped: categoryMix.length > 0,
    gondolaUnits: countGondolaUnits(layout.shelves),
  };
}
