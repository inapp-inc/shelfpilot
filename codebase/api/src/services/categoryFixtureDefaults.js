/** Default fixture type per category id / name pattern for smart autogenerate. */
import { levelsForType } from "./layoutPacker.js";
import { isDoubleSidedType, normalizeShelf } from "./shelfFaces.js";

const PRODUCE_PATTERNS = /fresh|produce|veg|fruit|hm-fresh/i;
const GROCERY_PATTERNS = /grocery|dry.?goods|hm-grocery|cv-grocery/i;

export function defaultFixtureTypeForCategory(categoryId, categoryName) {
  const id = String(categoryId || "");
  const name = String(categoryName || "");
  const hay = `${id} ${name}`;
  if (PRODUCE_PATTERNS.test(hay)) return "storage";
  if (GROCERY_PATTERNS.test(hay)) return "gondola";
  return "shelf";
}

export function fixtureTypeForMixEntry(entry, categoriesById) {
  if (entry?.fixtureType) return entry.fixtureType;
  const cat = categoriesById?.[entry?.categoryId];
  return defaultFixtureTypeForCategory(entry?.categoryId, cat?.name);
}

/** Re-type shelves after category mix assignment using per-category fixture types. */
export function applyFixtureTypesToShelves(shelves, categoryMix, categories, config) {
  if (!shelves?.length) return shelves || [];
  const byId = Object.fromEntries((categories || []).map((c) => [c.id, c]));
  const mixByCat = Object.fromEntries((categoryMix || []).map((m) => [m.categoryId, m]));
  const templates = config?.fixtureTemplates || [];

  return shelves.map((shelf) => {
    const catId =
      shelf.categoryId ||
      shelf.faces?.find((f) => f.categoryId)?.categoryId ||
      null;
    if (!catId) return shelf;
    const mixEntry = mixByCat[catId] || { categoryId: catId };
    const type = fixtureTypeForMixEntry(mixEntry, byId);
    const tmpl = templates.find((t) => t.type === type) || {};
    const height = Number(tmpl.defaultHeightMeters ?? shelf.heightMeters) || 2;
    const usable = Number(tmpl.defaultWidthMeters ?? shelf.usableWidthMeters) || 1.2;
    const depth = Number(tmpl.defaultDepthMeters ?? shelf.depthMeters) || 0.6;
    const doubleSided = isDoubleSidedType(type);
    const next = {
      ...shelf,
      type,
      usableWidthMeters: usable,
      widthMeters: usable,
      depthMeters: depth,
      heightMeters: height,
      doubleSided,
      levels: levelsForType(type, height, tmpl.defaultLevels),
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
