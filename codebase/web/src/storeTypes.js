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

export function defaultFixtureTypeForCategory(categoryId, categoryName) {
  const hay = `${categoryId || ""} ${categoryName || ""}`;
  if (PRODUCE_PATTERNS.test(hay)) return "storage";
  if (GROCERY_PATTERNS.test(hay)) return "gondola";
  return "shelf";
}

export function withFixtureTypeDefaults(rows, categories) {
  const byId = Object.fromEntries((categories || []).map((c) => [c.id, c]));
  return (rows || []).map((row) => ({
    ...row,
    fixtureType: row.fixtureType || defaultFixtureTypeForCategory(row.categoryId, byId[row.categoryId]?.name),
  }));
}

/**
 * Build a category mix from the ACTUAL loaded catalog (top-level categories),
 * so autogenerate assigns real category ids that have products — otherwise the
 * static template ids never match imported products and the planogram stays empty.
 */
export function mixFromCategories(categories) {
  const tops = (categories || []).filter((c) => !c.parentId);
  if (!tops.length) return null;
  const n = tops.length;
  const base = Math.floor(100 / n);
  const rows = tops.map((c) => {
    const name = String(c.name || c.id || "").toLowerCase();
    const temperatureZone = name.includes("frozen")
      ? "frozen"
      : name.includes("chill")
        ? "chilled"
        : "ambient";
    return {
      categoryId: c.id,
      label: c.name || c.id,
      emoji: temperatureZone === "frozen" ? "❄️" : temperatureZone === "chilled" ? "🧊" : "📦",
      percent: base,
      temperatureZone,
      color: c.color,
      fixtureType: defaultFixtureTypeForCategory(c.id, c.name),
    };
  });
  let drift = 100 - base * n;
  for (let i = 0; drift > 0; i = (i + 1) % n, drift -= 1) {
    rows[i].percent += 1;
  }
  return rows;
}
