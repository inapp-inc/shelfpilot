import { categoryDisplayName } from "../layout-editor/categoryFilter.js";

/** Flat API categories → nested tree (parentId links). */
export function buildCategoryTree(flat) {
  const byParent = {};
  for (const c of flat || []) {
    const key = c.parentId || "__root";
    if (!byParent[key]) byParent[key] = [];
    byParent[key].push(c);
  }

  function attachChildren(cat) {
    const children = (byParent[cat.id] || []).map((child) => attachChildren(child));
    return { ...cat, children };
  }

  return (byParent.__root || []).map((cat) => attachChildren(cat));
}

/** id → category record */
export function categoryById(categories) {
  const map = new Map();
  for (const c of categories || []) map.set(c.id, c);
  return map;
}

export function categoryLabel(categories, id) {
  return categoryDisplayName(id, categories);
}
