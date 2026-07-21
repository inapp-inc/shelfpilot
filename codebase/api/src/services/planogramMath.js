/**
 * Dimension-based planogram facing calculation.
 * Defaults when product attributes missing: width 0.2m, height 0.25m.
 */

export const DEFAULT_PRODUCT_WIDTH_M = 0.2;
export const DEFAULT_PRODUCT_HEIGHT_M = 0.25;

export function productDimensions(product) {
  const attrs = product?.attributes || {};
  const width =
    Number(attrs.widthMeters ?? attrs.width ?? DEFAULT_PRODUCT_WIDTH_M) || DEFAULT_PRODUCT_WIDTH_M;
  const height =
    Number(attrs.heightMeters ?? attrs.height ?? DEFAULT_PRODUCT_HEIGHT_M) || DEFAULT_PRODUCT_HEIGHT_M;
  const assumed =
    attrs.widthMeters == null &&
    attrs.width == null &&
    attrs.heightMeters == null &&
    attrs.height == null;
  return { widthMeters: width, heightMeters: height, assumedDimensions: assumed };
}

export function computeMaxFacings(usableWidthMeters, productWidthMeters) {
  const usable = Number(usableWidthMeters) || 0;
  const pw = Number(productWidthMeters) || DEFAULT_PRODUCT_WIDTH_M;
  if (usable <= 0 || pw <= 0) return 0;
  // Avoid IEEE float truncation (e.g. 1.2/0.2 === 5.999…)
  return Math.max(0, Math.floor(usable / pw + 1e-9));
}

export function computeSuggestedLevels(shelfHeightMeters, productHeightMeters) {
  const sh = Number(shelfHeightMeters) || 0;
  const ph = Number(productHeightMeters) || DEFAULT_PRODUCT_HEIGHT_M;
  if (sh <= 0 || ph <= 0) return 0;
  return Math.max(0, Math.floor(sh / ph + 1e-9));
}

export function clampFacings(requested, maxFacings) {
  const max = Math.max(0, Number(maxFacings) || 0);
  if (requested == null) return max;
  const n = Math.floor(Number(requested));
  if (!Number.isFinite(n) || n < 1) return Math.min(1, max) || 0;
  return Math.min(n, max);
}

export function previewFacings({ shelf, product, levelIndex = 0, segmentId = null }) {
  const started = performance.now();
  const dims = productDimensions(product);
  let usable = Number(shelf?.usableWidthMeters ?? shelf?.widthMeters) || 0;
  if (segmentId && Array.isArray(shelf?.segments)) {
    const seg = shelf.segments.find((s) => s.id === segmentId);
    if (seg) usable = Number(seg.widthMeters) || usable;
  }
  const maxFacings = computeMaxFacings(usable, dims.widthMeters);
  const suggestedLevels = computeSuggestedLevels(shelf?.heightMeters, dims.heightMeters);
  const durationMs = Number((performance.now() - started).toFixed(3));
  console.log(
    JSON.stringify({
      level: "info",
      message: "planogram_facing_calc",
      shelfId: shelf?.id,
      productId: product?.id,
      maxFacings,
      durationMs,
    })
  );
  return {
    shelfId: shelf?.id,
    productId: product?.id,
    levelIndex: Number(levelIndex) || 0,
    maxFacings,
    suggestedLevels,
    productWidthMeters: dims.widthMeters,
    productHeightMeters: dims.heightMeters,
    usableWidthMeters: usable,
    assumedDimensions: dims.assumedDimensions,
    durationMs,
  };
}
