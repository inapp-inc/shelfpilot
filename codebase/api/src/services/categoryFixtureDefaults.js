/** Default fixture type per category id / name pattern for smart autogenerate. */
import { levelsForType } from "./layoutPacker.js";
import { isDoubleSidedType, normalizeShelf } from "./shelfFaces.js";

const PRODUCE_PATTERNS = /fresh|produce|veg|fruit|hm-fresh/i;
const GROCERY_PATTERNS = /grocery|dry.?goods|hm-grocery|cv-grocery/i;
const CHILLED_PATTERNS = /chill|dairy|hm-chilled|cv-chilled|ph-chilled/i;
const FROZEN_PATTERNS = /frozen|hm-frozen/i;

export function defaultFixtureTypeForCategory(categoryId, categoryName, allowedTypes) {
  const allowed = allowedTypes?.length ? allowedTypes : null;
  const pick = (...candidates) => {
    if (allowed) return candidates.find((t) => allowed.includes(t)) || allowed[0] || "shelf";
    return candidates.find((t) => ["shelf", "gondola", "rack", "storage"].includes(t)) || candidates[0] || "shelf";
  };
  const hay = `${categoryId || ""} ${categoryName || ""}`;
  if (FROZEN_PATTERNS.test(hay)) return allowed?.includes("frozen") ? "frozen" : pick("shelf", "storage");
  if (CHILLED_PATTERNS.test(hay)) return allowed?.includes("chilled") ? "chilled" : pick("shelf", "gondola");
  if (PRODUCE_PATTERNS.test(hay)) return pick("storage", "shelf");
  if (GROCERY_PATTERNS.test(hay)) return allowed?.includes("ambient") ? "ambient" : pick("gondola", "shelf");
  return allowed?.includes("ambient") ? "ambient" : pick("shelf", "gondola");
}

export function fixtureTypeForMixEntry(entry, categoriesById, allowedTypes) {
  if (entry?.fixtureType) return entry.fixtureType;
  const cat = categoriesById?.[entry?.categoryId];
  return defaultFixtureTypeForCategory(entry?.categoryId, cat?.name, allowedTypes);
}

/** Re-type shelves after category mix assignment using per-category fixture types. */
export function applyFixtureTypesToShelves(shelves, categoryMix, categories, config) {
  if (!shelves?.length) return shelves || [];
  const byId = Object.fromEntries((categories || []).map((c) => [c.id, c]));
  const mixByCat = Object.fromEntries((categoryMix || []).map((m) => [m.categoryId, m]));
  const templates = config?.fixtureTemplates || [];
  const allowedTypes = templates.map((t) => t.type).filter(Boolean);

  return shelves.map((shelf) => {
    const catId =
      shelf.categoryId ||
      shelf.faces?.find((f) => f.categoryId)?.categoryId ||
      null;
    if (!catId) return shelf;
    const mixEntry = mixByCat[catId] || { categoryId: catId };
    const type = fixtureTypeForMixEntry(mixEntry, byId, allowedTypes);
    const tmpl = templates.find((t) => t.type === type) || templates[0] || {};
    const baseKind = tmpl.baseKind || tmpl.type || type;
    const height = Number(tmpl.defaultHeightMeters ?? shelf.heightMeters) || 2;
    const usable = Number(tmpl.defaultWidthMeters ?? shelf.usableWidthMeters) || 1.2;
    const depth = Number(tmpl.defaultDepthMeters ?? shelf.depthMeters) || 0.6;

    // Paired front/back shelves: preserve pair metadata; never force doubleSided.
    if (shelf.pairId) {
      return normalizeShelf({
        ...shelf,
        type,
        usableWidthMeters: usable,
        widthMeters: usable,
        depthMeters: depth,
        heightMeters: height,
        doubleSided: false,
        levels: levelsForType(baseKind, height, tmpl.defaultLevels),
      });
    }

    const doubleSided = isDoubleSidedType(type);
    const next = {
      ...shelf,
      type,
      usableWidthMeters: usable,
      widthMeters: usable,
      depthMeters: depth,
      heightMeters: height,
      doubleSided,
      levels: levelsForType(baseKind, height, tmpl.defaultLevels),
    };
    if (doubleSided && (!next.faces || next.faces.length < 2)) {
      next.faces = [
        { id: "A", categoryId: catId, planogram: next.faces?.[0]?.planogram || [] },
        { id: "B", categoryId: null, planogram: [] },
      ];
    }
    return normalizeShelf(next);
  });
}
