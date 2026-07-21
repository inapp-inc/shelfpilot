/** Category tree helpers for planogram filtering. */

export function descendantCategoryIds(rootId, categories) {
  if (!rootId) return new Set();
  const byParent = new Map();
  for (const c of categories || []) {
    const key = c.parentId || "__root";
    if (!byParent.has(key)) byParent.set(key, []);
    byParent.get(key).push(c.id);
  }
  const out = new Set([rootId]);
  const stack = [rootId];
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

export function productAllowedForShelf(product, shelfCategoryId, categories) {
  if (!shelfCategoryId) return false;
  const allowed = descendantCategoryIds(shelfCategoryId, categories);
  return allowed.has(product?.categoryId);
}
