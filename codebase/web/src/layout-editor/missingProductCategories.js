import { categoryDisplayName, resolveCategoryId } from "./categoryFilter.js";
import { categoryLabel } from "../catalog/buildCategoryTree.js";

/** Nest missing products under parentId links for expandable subcategory UI. */
export function buildMissingCategoryTree(missing, categories, rootCategoryId) {
  const resolvedRoot = rootCategoryId ? resolveCategoryId(rootCategoryId, categories) : null;
  const productsByCat = new Map();

  for (const p of missing) {
    const cid = resolveCategoryId(p.categoryId, categories) || p.categoryId || "__none__";
    if (!productsByCat.has(cid)) productsByCat.set(cid, []);
    productsByCat.get(cid).push(p);
  }

  function buildNode(categoryId) {
    if (categoryId === "__none__") {
      const products = productsByCat.get("__none__") || [];
      if (!products.length) return null;
      return {
        categoryId: "__none__",
        categoryName: "Uncategorized",
        products,
        children: [],
        totalCount: products.length,
      };
    }

    const cat = (categories || []).find((c) => c.id === categoryId);
    const childCats = (categories || []).filter((c) => c.parentId === categoryId);
    const children = childCats.map((c) => buildNode(c.id)).filter(Boolean);
    const products = productsByCat.get(categoryId) || [];
    const totalCount = products.length + children.reduce((sum, child) => sum + child.totalCount, 0);
    if (totalCount === 0) return null;

    return {
      categoryId,
      categoryName: cat?.name || categoryDisplayName(categoryId, categories),
      products,
      children,
      totalCount,
    };
  }

  if (resolvedRoot) {
    const node = buildNode(resolvedRoot);
    return node ? [node] : [];
  }

  const roots = (categories || []).filter((c) => !c.parentId);
  const nodes = roots.map((c) => buildNode(c.id)).filter(Boolean);
  const uncat = buildNode("__none__");
  if (uncat) nodes.push(uncat);
  return nodes.sort((a, b) => b.totalCount - a.totalCount);
}

export function flattenSubcategoryOptions(nodes, depth = 0, out = []) {
  for (const node of nodes) {
    out.push({ id: node.categoryId, name: node.categoryName, count: node.totalCount, depth });
    if (node.children?.length) flattenSubcategoryOptions(node.children, depth + 1, out);
  }
  return out;
}

export function findTreeNode(nodes, categoryId) {
  for (const node of nodes) {
    if (node.categoryId === categoryId) return node;
    const found = findTreeNode(node.children || [], categoryId);
    if (found) return found;
  }
  return null;
}

export function groupMissingByCategory(missing, categories) {
  const map = new Map();
  for (const p of missing) {
    const key = resolveCategoryId(p.categoryId, categories) || p.categoryId || "__none__";
    if (!map.has(key)) {
      map.set(key, {
        categoryId: key,
        categoryName: key === "__none__" ? "Uncategorized" : categoryLabel(categories, key),
        products: [],
      });
    }
    map.get(key).products.push(p);
  }
  return [...map.values()].sort((a, b) => b.products.length - a.products.length);
}
