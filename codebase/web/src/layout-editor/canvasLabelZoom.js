/**
 * Pixel-based shelf label visibility on the 2D canvas.
 * Labels show when the on-screen shelf (or gondola face) is large enough to read.
 * Uses long/short side checks so vertical (rotated) fixtures pass when the run
 * dimension is large even if the facing depth is narrow.
 */

/** Min long side (px) to fit a mono shelf label such as "4A". */
export const SHELF_LABEL_MIN_LONG_PX = 32;

/** Min short side (px) — facing depth on vertical gondolas. */
export const SHELF_LABEL_MIN_SHORT_PX = 10;

/** Min area (long × short) for label + optional emoji. */
export const SHELF_LABEL_MIN_AREA_PX = 320;

function shelfSides(pixelWidth, pixelHeight) {
  const w = Math.max(0, Number(pixelWidth) || 0);
  const h = Math.max(0, Number(pixelHeight) || 0);
  return { long: Math.max(w, h), short: Math.min(w, h), w, h };
}

/** Returns true when a rectangle on screen can fit a readable shelf number. */
export function shelfLabelFitsRect(pixelWidth, pixelHeight) {
  const { long, short } = shelfSides(pixelWidth, pixelHeight);
  if (long < SHELF_LABEL_MIN_LONG_PX || short < SHELF_LABEL_MIN_SHORT_PX) return false;
  return long * short >= SHELF_LABEL_MIN_AREA_PX;
}

/** Gondola face pane is half the shelf box on the split axis. */
export function gondolaFacePixelSize(pixelShelfW, pixelShelfH, splitAlongWidth) {
  if (splitAlongWidth) {
    return { width: pixelShelfW * 0.5, height: pixelShelfH };
  }
  return { width: pixelShelfW, height: pixelShelfH * 0.5 };
}

export function shelfLabelFitsGondolaFace(pixelShelfW, pixelShelfH, splitAlongWidth) {
  const face = gondolaFacePixelSize(pixelShelfW, pixelShelfH, splitAlongWidth);
  return shelfLabelFitsRect(face.width, face.height);
}

/** Center badge on a single fixture (non-merged gondola). */
export function shelfLabelFitsShelfBadge(pixelWidth, pixelHeight, { dualFace = false } = {}) {
  const { long, short } = shelfSides(pixelWidth, pixelHeight);
  if (dualFace) {
    return long >= 40 && short >= 14 && long * short >= SHELF_LABEL_MIN_AREA_PX;
  }
  return shelfLabelFitsRect(pixelWidth, pixelHeight);
}

/** Edge labels on dual-face shelves (4A / 4B on long edges). */
export function shelfLabelFitsFaceEdge(pixelWidth, pixelHeight, splitAlongWidth) {
  const { long, short } = shelfSides(pixelWidth, pixelHeight);
  if (splitAlongWidth) {
    // Labels sit on left/right; long run is usually height when aisles are vertical.
    return long >= SHELF_LABEL_MIN_LONG_PX && short >= 14;
  }
  return long >= SHELF_LABEL_MIN_LONG_PX && short >= 14;
}
