/** HTML5 drag payload for missing catalog products → shelf placement. */
export const MISSING_PRODUCT_MIME = "application/x-shelfpilot-missing-product";

export function serializeMissingProduct(product) {
  return JSON.stringify({
    productId: product.id,
    categoryId: product.categoryId || null,
    name: product.name || product.sku || product.id,
    sku: product.sku || null,
  });
}

export function parseMissingProduct(raw) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!parsed?.productId) return null;
    return parsed;
  } catch {
    return null;
  }
}
