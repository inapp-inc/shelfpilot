/** Flat API categories → nested tree (parentId links). */
export function buildCategoryTree(flat) {
  const byParent = {};
  for (const c of flat || []) {
    const key = c.parentId || "__root";
    if (!byParent[key]) byParent[key] = [];
    byParent[key].push(c);
  }
  return (byParent.__root || []).map((c) => ({
    ...c,
    children: byParent[c.id] || [],
  }));
}

/** id → category record */
export function categoryById(categories) {
  const map = new Map();
  for (const c of categories || []) map.set(c.id, c);
  return map;
}

export function categoryLabel(categories, id) {
  if (!id) return "—";
  return categoryById(categories).get(id)?.name || id;
}
