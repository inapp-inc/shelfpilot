/**
 * Dimension-based planogram facing calculation.
 * Defaults when product attributes missing: width 0.2m, height 0.25m.
 * FR-BUF-01: lateral 1 cm buffer per product (0.5 cm per side) via shared/productBuffer.mjs.
 */

import {
  computeMaxDepthFacings,
  computeMaxFacings,
  PRODUCT_LATERAL_BUFFER_BAY_RESERVE_M,
  PRODUCT_LATERAL_BUFFER_TOTAL_M,
  productSlotDepthMeters,
  productSlotWidthMeters,
} from "../../../shared/productBuffer.mjs";

export {
  computeMaxDepthFacings,
  computeMaxFacings,
  PRODUCT_LATERAL_BUFFER_BAY_RESERVE_M,
  PRODUCT_LATERAL_BUFFER_TOTAL_M,
  productSlotDepthMeters,
  productSlotWidthMeters,
};

export const DEFAULT_PRODUCT_WIDTH_M = 0.2;
export const DEFAULT_PRODUCT_HEIGHT_M = 0.25;

export function productDimensions(product) {
  const attrs = product?.attributes || {};
  const cm = (v) => (v != null ? Number(v) / 100 : null);
  const width =
    Number(attrs.widthMeters ?? attrs.width ?? cm(product?.widthCm ?? attrs.widthCm) ?? DEFAULT_PRODUCT_WIDTH_M) ||
    DEFAULT_PRODUCT_WIDTH_M;
  const height =
    Number(attrs.heightMeters ?? attrs.height ?? cm(product?.heightCm ?? attrs.heightCm) ?? DEFAULT_PRODUCT_HEIGHT_M) ||
    DEFAULT_PRODUCT_HEIGHT_M;
  const depth =
    Number(attrs.depthMeters ?? attrs.depth ?? cm(product?.depthCm ?? attrs.depthCm) ?? width) || width;
  const assumed =
    attrs.widthMeters == null &&
    attrs.width == null &&
    attrs.widthCm == null &&
    product?.widthCm == null &&
    attrs.heightMeters == null &&
    attrs.height == null &&
    attrs.heightCm == null &&
    product?.heightCm == null;
  return { widthMeters: width, heightMeters: height, depthMeters: depth, assumedDimensions: assumed };
}

export function computeSuggestedDepthFacings(shelfDepthMeters, productDepthMeters) {
  return computeMaxDepthFacings(shelfDepthMeters, productDepthMeters);
}

export function computeSuggestedLevels(shelfHeightMeters, productHeightMeters) {
  const sh = Number(shelfHeightMeters) || 0;
  const ph = Number(productHeightMeters) || DEFAULT_PRODUCT_HEIGHT_M;
  if (sh <= 0 || ph <= 0) return 0;
  return Math.max(0, Math.floor(sh / ph + 1e-9));
}

/** How many units can stack vertically on one level (same position). */
export function computeMaxStackLayers(levelClearHeightMeters, productHeightMeters) {
  const clear = Number(levelClearHeightMeters) || 0;
  const ph = Number(productHeightMeters) || DEFAULT_PRODUCT_HEIGHT_M;
  if (clear <= 0 || ph <= 0) return 1;
  const usable = clear - STACK_LAYER_GAP_M;
  if (usable <= 0) return 1;
  return Math.max(1, Math.floor(usable / (ph + STACK_LAYER_GAP_M) + 1e-9));
}

/** Inventory units for one placement (wide × deep × stacked high). */
export function placementUnitCount(placement) {
  const wide = Math.max(0, Number(placement?.facings) || 0);
  const deep = Math.max(1, Number(placement?.depthFacings) || 1);
  const high = Math.max(1, Number(placement?.stackLayers) || 1);
  return wide * deep * high;
}

export function clampStackLayers(requested, maxStackLayers) {
  return clampFacings(requested, maxStackLayers);
}

export function clampFacings(requested, maxFacings) {
  const max = Math.max(0, Number(maxFacings) || 0);
  if (requested == null) return max;
  const n = Math.floor(Number(requested));
  if (!Number.isFinite(n) || n < 1) return Math.min(1, max) || 0;
  return Math.min(n, max);
}

export function clampDepthFacings(requested, maxDepthFacings) {
  return clampFacings(requested, maxDepthFacings);
}

import { levelSegmentsList } from "./shelfSegments.js";
import { faceDepthMeters, levelClearHeightMeters, STACK_LAYER_GAP_M } from "./shelfGeometry.js";
import { levelLoadLimitKg, productWeightKg } from "./weightMath.js";

export function previewFacings({ shelf, product, levelIndex = 0, segmentId = null, faceId = "A" }) {
  const started = performance.now();
  const dims = productDimensions(product);
  let usable = Number(shelf?.usableWidthMeters ?? shelf?.widthMeters) || 0;
  const segments = levelSegmentsList(shelf, faceId, levelIndex);
  if (segmentId && segments.length) {
    const seg = segments.find((s) => s.id === segmentId);
    if (seg) usable = Number(seg.widthMeters) || usable;
  } else if (segmentId && Array.isArray(shelf?.segments)) {
    const seg = shelf.segments.find((s) => s.id === segmentId);
    if (seg) usable = Number(seg.widthMeters) || usable;
  }
  const depthFromCm =
    product?.depthCm != null
      ? Number(product.depthCm) / 100
      : product?.attributes?.depthCm != null
        ? Number(product.attributes.depthCm) / 100
        : null;
  const depthDim =
    Number(
      product?.attributes?.depthMeters ?? product?.attributes?.depth ?? depthFromCm ?? dims.depthMeters ?? dims.widthMeters
    ) || dims.depthMeters || dims.widthMeters;
  const usableDepth = faceDepthMeters(shelf);
  const clearHeight = levelClearHeightMeters(shelf, levelIndex);
  const maxDepthFacings = computeSuggestedDepthFacings(usableDepth, depthDim);
  const maxFacings = computeMaxFacings(usable, dims.widthMeters);
  const suggestedLevels = computeSuggestedLevels(shelf?.heightMeters, dims.heightMeters);
  const maxStackLayers = computeMaxStackLayers(clearHeight, dims.heightMeters);

  // Level height gate: a product taller than the clear height cannot go on this level.
  const fitsLevelHeight = clearHeight <= 0 || dims.heightMeters <= clearHeight + 1e-9;

  const unitWeightKg = productWeightKg(product);
  const levelLoadLimit = levelLoadLimitKg(shelf);
  const maxUnitsByWeight =
    unitWeightKg > 0 ? Math.max(0, Math.floor(levelLoadLimit / unitWeightKg + 1e-9)) : null;

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
    maxDepthFacings,
    maxStackLayers,
    suggestedLevels,
    productWidthMeters: dims.widthMeters,
    productHeightMeters: dims.heightMeters,
    productDepthMeters: depthDim,
    shelfDepthMeters: Number(shelf?.depthMeters) || 0,
    usableDepthMeters: Number(usableDepth.toFixed(3)),
    usableWidthMeters: usable,
    levelClearHeightMeters: clearHeight,
    productBufferMeters: PRODUCT_LATERAL_BUFFER_TOTAL_M,
    bayBufferReserveMeters: PRODUCT_LATERAL_BUFFER_BAY_RESERVE_M,
    slotWidthMeters: productSlotWidthMeters(dims.widthMeters),
    slotDepthMeters: productSlotDepthMeters(depthDim),
    fitsLevelHeight,
    productWeightKg: Number(unitWeightKg.toFixed(3)),
    levelLoadLimitKg: Number(levelLoadLimit.toFixed(2)),
    maxUnitsByWeight,
    assumedDimensions: dims.assumedDimensions,
    durationMs,
  };
}
