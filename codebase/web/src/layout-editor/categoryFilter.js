/** Category tree helpers for planogram filtering (client). */

const LEGACY_CATEGORY_ALIASES = {
  "fresh-produce": "cat-fresh-produce",
  grocery: "cat-grocery",
  chilled: "cat-beverages",
  frozen: "cat-frozen",
  seasonal: "cat-grocery",
  "hm-fresh": "cat-fresh-produce",
  "hm-grocery": "cat-grocery",
  "hm-chilled": "cat-beverages",
  "hm-frozen": "cat-frozen",
  "hm-seasonal": "cat-grocery",
  "cv-grocery": "cat-grocery",
  "cv-chilled": "cat-beverages",
  "cv-snacks": "cat-grocery",
  "cv-personal": "cat-health",
};

export function normalizeCategoryKey(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/^cat-/, "")
    .replace(/^(hm-|cv-|ph-)/, "")
    .replace(/[^a-z0-9]+/g, "");
}

/** Merge category lists for a layout vertical (dedupe by id). */
export function mergeCategoriesForLayout(vertical, listsByVertical) {
  const seen = new Set();
  const merged = [];
  for (const v of catalogVerticalsForLayout(vertical)) {
    for (const c of listsByVertical[v] || []) {
      if (!seen.has(c.id)) {
        seen.add(c.id);
        merged.push(c);
      }
    }
  }
  return merged;
}

export function resolveCategoryId(categoryId, categories) {
  if (!categoryId) return null;
  const list = categories || [];
  const alias = LEGACY_CATEGORY_ALIASES[categoryId];
  if (alias && list.some((c) => c.id === alias)) return alias;
  if (list.some((c) => c.id === categoryId)) return categoryId;
  const key = normalizeCategoryKey(categoryId);
  const match = list.find(
    (c) => normalizeCategoryKey(c.id) === key || normalizeCategoryKey(c.name) === key
  );
  return match?.id || categoryId;
}

export function catalogVerticalsForLayout(vertical) {
  const v = String(vertical || "retail").toLowerCase();
  if (v === "hypermarket") return ["hypermarket", "retail"];
  return [v];
}

export function descendantCategoryIds(rootId, categories) {
  const resolvedRoot = resolveCategoryId(rootId, categories);
  if (!resolvedRoot) return new Set();
  const byParent = new Map();
  for (const c of categories || []) {
    const key = c.parentId || "__root";
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(c.id);
  }
  const out = new Set([resolvedRoot]);
  const stack = [resolvedRoot];
  while (stack.length) {
    const id = stack.pop();
    for (const child of byParent.get(id) || []) {
      if (!out.has(child)) {
        out.add(child);
        stack.push(child);
      }
    }
  }
  return out;
}

export function filterProductsForShelf(products, shelfCategoryId, categories) {
  if (!shelfCategoryId) return [];
  const allowed = descendantCategoryIds(shelfCategoryId, categories);
  return (products || []).filter((p) => {
    const productCat = resolveCategoryId(p.categoryId, categories);
    return allowed.has(productCat) || allowed.has(p.categoryId);
  });
}
