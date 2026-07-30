import { resolveAssetUrl } from "./assetUrl.js";

/** Build lookup map for planogram productId → catalog product. */
export function buildProductLookup(products) {
  const byId = new Map();
  const bySku = new Map();
  for (const p of products || []) {
    if (p.id) byId.set(p.id, p);
    if (p.sku) {
      bySku.set(p.sku, p);
      bySku.set(String(p.sku).toLowerCase(), p);
    }
  }
  return { byId, bySku, list: products || [] };
}

export function resolveCatalogProduct(lookup, productId) {
  if (!productId) return null;
  const id = String(productId);
  return (
    lookup.byId.get(id) ||
    lookup.bySku.get(id) ||
    lookup.bySku.get(id.toLowerCase()) ||
    lookup.list.find((p) => p.id === id || p.sku === id) ||
    null
  );
}

export function productImageUrl(product) {
  if (!product) return null;
  const raw = product.imageUrl || product.attributes?.imageUrl || product.attributes?.image;
  if (!raw || typeof raw !== "string") return null;
  return resolveAssetUrl(raw);
}

export function productDimensions(product) {
  const w = Number(product?.widthMeters ?? product?.attributes?.widthMeters) || 0.2;
  const h = Number(product?.heightMeters ?? product?.attributes?.heightMeters) || 0.25;
  const d = Number(product?.depthMeters ?? product?.attributes?.depthMeters) || 0.15;
  return { w, h, d };
}
