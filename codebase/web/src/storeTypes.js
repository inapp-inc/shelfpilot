import { normalizeCategoryKey, resolveCategoryId } from "./layout-editor/categoryFilter.js";

/** Store type registry — UI label → vertical key + default category mix templates. */

export const STORE_TYPES = [
  { id: "hypermarket", label: "Hypermarket", emoji: "🏬", vertical: "hypermarket" },
  { id: "supermarket", label: "Supermarket", emoji: "🛒", vertical: "retail" },
  { id: "pharmacy", label: "Pharmacy", emoji: "💊", vertical: "pharmacy" },
  { id: "beauty", label: "Beauty", emoji: "💄", vertical: "beauty" },
  { id: "apparel", label: "Apparel", emoji: "👔", vertical: "apparel" },
  { id: "convenience", label: "Convenience", emoji: "🏪", vertical: "convenience" },
];

export const NAV_MODULES = [
  { id: "dashboard", emoji: "📊", label: "Dashboard", path: "/dashboard", color: "#C4183A" },
  { id: "layouts", emoji: "🗺️", label: "Layouts", path: "/layouts", color: "#0ea5e9" },
  { id: "catalog", emoji: "📦", label: "Products", path: "/products", color: "#16a34a" },
  { id: "analytics", emoji: "📈", label: "Analytics", path: "/analytics", color: "#f59e0b" },
  { id: "admin", emoji: "⚙️", label: "Admin", path: "/admin", color: "#a855f7" },
];

/** Default category mix templates per store type id (percentages sum to 100). */
export const DEFAULT_CATEGORY_MIX = {
  hypermarket: [
    { categoryId: "hm-fresh", label: "Fresh produce", emoji: "🥬", percent: 25, temperatureZone: "ambient" },
    { categoryId: "hm-grocery", label: "Grocery / Dry goods", emoji: "🛒", percent: 30, temperatureZone: "ambient" },
    { categoryId: "hm-chilled", label: "Chilled", emoji: "🧊", percent: 20, temperatureZone: "chilled" },
    { categoryId: "hm-frozen", label: "Frozen", emoji: "❄️", percent: 10, temperatureZone: "frozen" },
    { categoryId: "hm-seasonal", label: "Seasonal / Promo", emoji: "🏷️", percent: 15, temperatureZone: "ambient" },
  ],
  supermarket: [
    { categoryId: "fresh-produce", label: "Fresh produce", emoji: "🥬", percent: 20, temperatureZone: "ambient" },
    { categoryId: "grocery", label: "Grocery", emoji: "🛒", percent: 45, temperatureZone: "ambient" },
    { categoryId: "chilled", label: "Chilled", emoji: "🧊", percent: 20, temperatureZone: "chilled" },
    { categoryId: "frozen", label: "Frozen", emoji: "❄️", percent: 10, temperatureZone: "frozen" },
    { categoryId: "seasonal", label: "Seasonal", emoji: "🏷️", percent: 5, temperatureZone: "ambient" },
  ],
  pharmacy: [
    { categoryId: "otc", label: "OTC", emoji: "💊", percent: 40, temperatureZone: "ambient" },
    { categoryId: "rx", label: "Prescription", emoji: "📋", percent: 15, temperatureZone: "ambient" },
    { categoryId: "vitamins", label: "Vitamins", emoji: "🌿", percent: 20, temperatureZone: "ambient" },
    { categoryId: "personal", label: "Personal care", emoji: "🧴", percent: 15, temperatureZone: "ambient" },
    { categoryId: "ph-chilled", label: "Chilled", emoji: "🧊", percent: 10, temperatureZone: "chilled" },
  ],
  beauty: [
    { categoryId: "skincare", label: "Skincare", emoji: "✨", percent: 35, temperatureZone: "ambient" },
    { categoryId: "makeup", label: "Makeup", emoji: "💋", percent: 30, temperatureZone: "ambient" },
    { categoryId: "fragrance", label: "Fragrance", emoji: "🌸", percent: 20, temperatureZone: "ambient" },
    { categoryId: "haircare", label: "Haircare", emoji: "💇", percent: 15, temperatureZone: "ambient" },
  ],
  apparel: [
    { categoryId: "womens", label: "Womenswear", emoji: "👗", percent: 35, temperatureZone: "ambient" },
    { categoryId: "mens", label: "Menswear", emoji: "👔", percent: 30, temperatureZone: "ambient" },
    { categoryId: "accessories", label: "Accessories", emoji: "👜", percent: 20, temperatureZone: "ambient" },
    { categoryId: "footwear", label: "Footwear", emoji: "👟", percent: 15, temperatureZone: "ambient" },
  ],
  convenience: [
    { categoryId: "cv-grocery", label: "Grocery", emoji: "🛒", percent: 40, temperatureZone: "ambient" },
    { categoryId: "cv-chilled", label: "Chilled", emoji: "🧊", percent: 25, temperatureZone: "chilled" },
    { categoryId: "cv-snacks", label: "Snacks / Promo", emoji: "🏷️", percent: 20, temperatureZone: "ambient" },
    { categoryId: "cv-personal", label: "Personal care", emoji: "🧴", percent: 15, temperatureZone: "ambient" },
  ],
};

export function storeTypeForVertical(vertical) {
  return STORE_TYPES.find((s) => s.vertical === vertical) || STORE_TYPES.find((s) => s.id === "supermarket");
}

export function mixForStoreType(storeTypeId) {
  return (DEFAULT_CATEGORY_MIX[storeTypeId] || DEFAULT_CATEGORY_MIX.supermarket).map((row) => ({ ...row }));
}

export function mixForVertical(vertical) {
  const st = storeTypeForVertical(vertical);
  return mixForStoreType(st?.id || "supermarket");
}

const PRODUCE_PATTERNS = /fresh|produce|veg|fruit|hm-fresh/i;
const GROCERY_PATTERNS = /grocery|dry.?goods|hm-grocery|cv-grocery/i;
const CHILLED_PATTERNS = /chill|dairy|hm-chilled|cv-chilled|ph-chilled/i;
const FROZEN_PATTERNS = /frozen|hm-frozen/i;
const SEASONAL_PATTERNS = /season|promo|hm-seasonal|cv-snacks/i;
const PHARMA_PATTERNS = /otc|prescription|rx|vitamin|💊/i;
const BEAUTY_PATTERNS = /skin|makeup|fragrance|hair/i;
const APPAREL_PATTERNS = /women|men|wear|foot|accessor/i;

/** Infer emoji from category name/id and temperature zone. */
export function emojiForCategory(categoryId, categoryName, temperatureZone, templateRows = []) {
  const hay = `${categoryId || ""} ${categoryName || ""}`.toLowerCase();
  for (const row of templateRows || []) {
    if (row.categoryId && row.categoryId === categoryId) return row.emoji || "📦";
    const tl = String(row.label || "").toLowerCase();
    if (tl && hay.includes(tl.split("/")[0].trim().slice(0, 6))) return row.emoji || "📦";
  }
  if (FROZEN_PATTERNS.test(hay) || temperatureZone === "frozen") return "❄️";
  if (CHILLED_PATTERNS.test(hay) || temperatureZone === "chilled") return "🧊";
  if (PRODUCE_PATTERNS.test(hay)) return "🥬";
  if (GROCERY_PATTERNS.test(hay)) return "🛒";
  if (SEASONAL_PATTERNS.test(hay)) return "🏷️";
  if (PHARMA_PATTERNS.test(hay)) return "💊";
  if (/vitamin|supplement/.test(hay)) return "🌿";
  if (/personal|care|toiletries/.test(hay)) return "🧴";
  if (BEAUTY_PATTERNS.test(hay)) return "✨";
  if (APPAREL_PATTERNS.test(hay)) return "👔";
  return "📦";
}

function temperatureZoneForName(name) {
  const n = String(name || "").toLowerCase();
  if (FROZEN_PATTERNS.test(n)) return "frozen";
  if (CHILLED_PATTERNS.test(n)) return "chilled";
  return "ambient";
}

/** Remove duplicate category ids (keep first). */
export function dedupeMixRows(rows) {
  const seen = new Set();
  return (rows || []).filter((row) => {
    const id = row.categoryId;
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function merchandisingDedupeKey(category, categories) {
  const resolved = resolveCategoryId(category.id, categories);
  const row = categories.find((c) => c.id === resolved) || category;
  const nameKey = normalizeCategoryKey(row.name);
  if (nameKey.length >= 3) return nameKey;
  return normalizeCategoryKey(resolved) || normalizeCategoryKey(category.id);
}

function pickPreferredCategory(a, b, categories) {
  const score = (c) => {
    const resolved = resolveCategoryId(c.id, categories);
    if (c.id === resolved) return 4;
    if (String(c.id).startsWith("cat-")) return 3;
    if (String(resolved).startsWith("cat-") && categories.some((x) => x.id === resolved)) return 2;
    return 1;
  };
  return score(a) >= score(b) ? a : b;
}

/** Top-level catalog categories with legacy / cross-vertical duplicates merged. */
export function uniqueTopLevelCategories(categories) {
  const tops = (categories || []).filter((c) => !c.parentId);
  const byKey = new Map();
  for (const c of tops) {
    const key = merchandisingDedupeKey(c, categories);
    if (!key) continue;
    const prev = byKey.get(key);
    byKey.set(key, prev ? pickPreferredCategory(c, prev, categories) : c);
  }
  return [...byKey.values()];
}

export function defaultFixtureTypeForCategory(categoryId, categoryName, allowedTypes) {
  const allowed = allowedTypes?.length ? allowedTypes : ["shelf", "gondola", "rack", "storage", "ambient", "chilled", "frozen"];
  const pick = (...candidates) => candidates.find((t) => allowed.includes(t)) || allowed[0] || "shelf";
  const hay = `${categoryId || ""} ${categoryName || ""}`;
  if (FROZEN_PATTERNS.test(hay)) return pick("frozen", "shelf", "storage", "gondola");
  if (CHILLED_PATTERNS.test(hay)) return pick("chilled", "ambient", "gondola", "shelf");
  if (PRODUCE_PATTERNS.test(hay)) return pick("storage", "ambient", "shelf", "gondola");
  if (GROCERY_PATTERNS.test(hay)) return pick("ambient", "gondola", "shelf", "storage");
  return pick("ambient", "gondola", "shelf", "rack", "storage");
}

export function withFixtureTypeDefaults(rows, categories, allowedTypes) {
  const byId = Object.fromEntries((categories || []).map((c) => [c.id, c]));
  const allowed = allowedTypes?.length ? allowedTypes : null;
  return (rows || []).map((row) => ({
    ...row,
    fixtureType:
      row.fixtureType && (!allowed || allowed.includes(row.fixtureType))
        ? row.fixtureType
        : defaultFixtureTypeForCategory(row.categoryId, byId[row.categoryId]?.name, allowed),
  }));
}

/**
 * Build a category mix from the ACTUAL loaded catalog (top-level categories),
 * preserving template emojis where names match. Dedupes by category id.
 */
export function mixFromCategories(categories, vertical = "retail", allowedTypes) {
  const unique = uniqueTopLevelCategories(categories);
  const tops = dedupeMixRows(
    unique.map((c) => {
      const categoryId = resolveCategoryId(c.id, categories) || c.id;
      const cat = categories.find((x) => x.id === categoryId) || c;
      return { categoryId, label: cat.name || c.name || categoryId };
    })
  );
  if (!tops.length) return null;

  const template = mixForVertical(vertical);
  const n = tops.length;
  const base = Math.floor(100 / n);
  const rows = tops.map((c) => {
    const cat = categories.find((x) => x.id === c.categoryId);
    const name = cat?.name || c.label || "";
    const temperatureZone = temperatureZoneForName(name);
    return {
      categoryId: c.categoryId,
      label: name || c.categoryId,
      emoji: emojiForCategory(c.categoryId, name, temperatureZone, template),
      percent: base,
      temperatureZone,
      color: cat?.color,
      fixtureType: defaultFixtureTypeForCategory(c.categoryId, name, allowedTypes),
    };
  });
  let drift = 100 - base * n;
  for (let i = 0; drift > 0; i = (i + 1) % n, drift -= 1) {
    rows[i].percent += 1;
  }
  return dedupeMixRows(rows);
}

/** Catalog-first mix with template fallback. */
export function buildCategoryMix(categories, vertical = "retail", fixtureTypes) {
  const allowedTypes = (fixtureTypes || []).map((t) => t.type).filter(Boolean);
  return withFixtureTypeDefaults(
    mixFromCategories(categories, vertical, allowedTypes) || mixForVertical(vertical),
    categories,
    allowedTypes
  );
}
