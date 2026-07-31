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
  const attrs = product?.attributes || {};
  const cm = (v) => (v != null && v !== "" ? Number(v) / 100 : null);
  const w =
    Number(product?.widthMeters ?? attrs.widthMeters ?? attrs.width ?? cm(product?.widthCm ?? attrs.widthCm)) ||
    0.2;
  const h =
    Number(
      product?.heightMeters ?? attrs.heightMeters ?? attrs.height ?? cm(product?.heightCm ?? attrs.heightCm)
    ) || 0.25;
  const d =
    Number(product?.depthMeters ?? attrs.depthMeters ?? attrs.depth ?? cm(product?.depthCm ?? attrs.depthCm)) ||
    Math.min(w, 0.15);
  const assumedDimensions =
    product?.widthMeters == null &&
    attrs.widthMeters == null &&
    attrs.width == null &&
    product?.widthCm == null &&
    attrs.widthCm == null &&
    product?.heightMeters == null &&
    attrs.heightMeters == null &&
    attrs.height == null &&
    product?.heightCm == null &&
    attrs.heightCm == null;
  return { w, h, d, widthMeters: w, heightMeters: h, depthMeters: d, assumedDimensions };
}
