/** Default fixture type per category id / name pattern for smart autogenerate. */
import { levelsForType } from "./layoutPacker.js";
import { isDoubleSidedType, normalizeShelf, syncPairedShelfFootprints } from "./shelfFaces.js";
import { warehouseLayoutMode } from "./warehouseLayout.js";

const PRODUCE_PATTERNS = /fresh|produce|veg|fruit|hm-fresh/i;
const GROCERY_PATTERNS = /grocery|dry.?goods|hm-grocery|cv-grocery/i;
const CHILLED_PATTERNS = /chill|dairy|hm-chilled|cv-chilled|ph-chilled|wh-cold/i;
const FROZEN_PATTERNS = /frozen|hm-frozen/i;
const BULK_PATTERNS = /bulk|wh-bulk|pallet/i;
const PICK_PATTERNS = /pick|wh-pick|selective/i;
const STAGING_PATTERNS = /stag|dispatch|wh-staging|returns|wh-returns/i;

export function defaultFixtureTypeForCategory(categoryId, categoryName, allowedTypes, vertical) {
  const allowed = allowedTypes?.length ? allowedTypes : null;
  const pick = (...candidates) => {
    if (allowed) return candidates.find((t) => allowed.includes(t)) || allowed[0] || "shelf";
    return candidates.find((t) => ["shelf", "gondola", "rack", "storage"].includes(t)) || candidates[0] || "shelf";
  };
  const hay = `${categoryId || ""} ${categoryName || ""}`;
  if (FROZEN_PATTERNS.test(hay)) return allowed?.includes("frozen") ? "frozen" : pick("shelf", "storage");
  if (CHILLED_PATTERNS.test(hay)) return allowed?.includes("chilled") ? "chilled" : pick("shelf", "gondola");
  if (BULK_PATTERNS.test(hay)) return pick("bulk_storage", "pallet_rack", "storage");
  if (PICK_PATTERNS.test(hay)) return pick("selective_rack", "pallet_rack", "rack");
  if (STAGING_PATTERNS.test(hay)) return pick("staging_lane", "bulk_storage", "storage");
  if (PRODUCE_PATTERNS.test(hay)) return pick("storage", "shelf");
  if (GROCERY_PATTERNS.test(hay)) return allowed?.includes("ambient") ? "ambient" : pick("gondola", "shelf");
  if (warehouseLayoutMode(vertical)) return pick("pallet_rack", "selective_rack", "bulk_storage", "staging_lane");
  return allowed?.includes("ambient") ? "ambient" : pick("shelf", "gondola");
}

export function fixtureTypeForMixEntry(entry, categoriesById, allowedTypes, vertical) {
  if (entry?.fixtureType) return entry.fixtureType;
  const cat = categoriesById?.[entry?.categoryId];
  return defaultFixtureTypeForCategory(entry?.categoryId, cat?.name, allowedTypes, vertical);
}

/**
 * Re-type shelves after category mix. Preserves packed W×D so Smart Generate
 * geometry cannot grow into neighbors (overlaps). Type/levels/height only.
 */
export function applyFixtureTypesToShelves(shelves, categoryMix, categories, config) {
  if (!shelves?.length) return shelves || [];
  const byId = Object.fromEntries((categories || []).map((c) => [c.id, c]));
  const mixByCat = Object.fromEntries((categoryMix || []).map((m) => [m.categoryId, m]));
  const templates = config?.fixtureTemplates || [];
  const allowedTypes = templates.map((t) => t.type).filter(Boolean);

  const typed = shelves.map((shelf) => {
    const catId =
      shelf.categoryId ||
      shelf.faces?.find((f) => f.categoryId)?.categoryId ||
      null;
    if (!catId) return shelf;
    const mixEntry = mixByCat[catId] || { categoryId: catId };
    const type = fixtureTypeForMixEntry(mixEntry, byId, allowedTypes, config?.vertical);
    const tmpl = templates.find((t) => t.type === type) || templates[0] || {};
    const baseKind = tmpl.baseKind || tmpl.type || type;
    // Height may follow template; never resize floor footprint after packing.
    const height = Number(tmpl.defaultHeightMeters ?? shelf.heightMeters) || 2;
    const usable = Number(shelf.usableWidthMeters ?? shelf.widthMeters) || 1.2;
    const depth = Number(shelf.depthMeters) || 0.6;
    const width = Number(shelf.widthMeters ?? usable) || usable;

    if (shelf.pairId) {
      return normalizeShelf({
        ...shelf,
        type,
        usableWidthMeters: usable,
        widthMeters: width,
        depthMeters: depth,
        heightMeters: height,
        doubleSided: false,
        levels: levelsForType(baseKind, height, tmpl.defaultLevels ?? shelf.levels?.length),
      });
    }

    const doubleSided = warehouseLayoutMode(config?.vertical) ? false : isDoubleSidedType(type);
    const next = {
      ...shelf,
      type,
      usableWidthMeters: usable,
      widthMeters: width,
      depthMeters: depth,
      heightMeters: height,
      doubleSided,
      levels: levelsForType(baseKind, height, tmpl.defaultLevels ?? shelf.levels?.length),
    };
    if (doubleSided && (!next.faces || next.faces.length < 2)) {
      next.faces = [
        { id: "A", categoryId: catId, planogram: next.faces?.[0]?.planogram || [] },
        { id: "B", categoryId: null, planogram: [] },
      ];
    }
    return normalizeShelf(next);
  });

  return syncPairedShelfFootprints(typed);
}
