/**
 * Planogram coverage — which catalog products are placed on shelves vs missing.
 */
import { normalizeShelf } from "./shelfFaces.js";
import { loadProductsForLayoutVertical } from "./planogramAutoFill.js";

export function collectPlacedProductIds(layout) {
  const ids = new Set();
  for (const raw of layout.shelves || []) {
    const shelf = normalizeShelf({ ...raw });
    for (const face of shelf.faces || []) {
      for (const p of face.planogram || []) {
        if (p?.productId) ids.add(p.productId);
      }
    }
    for (const p of shelf.planogram || []) {
      if (p?.productId) ids.add(p.productId);
    }
  }
  return ids;
}

export function computePlanogramCoverage(layout, listCategories, listProducts) {
  const vertical = layout.vertical || "retail";
  const { categories, products } = loadProductsForLayoutVertical(vertical, listCategories, listProducts);
  const placedIds = collectPlacedProductIds(layout);
  const placed = products.filter((p) => placedIds.has(p.id));
  const missing = products.filter((p) => !placedIds.has(p.id));
  const total = products.length;
  const coveragePercent = total ? Math.round((placed.length / total) * 100) : 100;

  return {
    vertical,
    totalProducts: total,
    placedCount: placed.length,
    missingCount: missing.length,
    coveragePercent,
    placedProductIds: [...placedIds],
    missingProducts: missing.map((p) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      categoryId: p.categoryId,
    })),
  };
}
