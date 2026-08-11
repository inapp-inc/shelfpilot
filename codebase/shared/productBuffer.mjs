/**
 * FR-BUF-01 — product dimension buffer for planogram capacity (shared web + API).
 * 1 cm total lateral spacing per unit: 0.5 cm per side.
 */

/** Per-side clearance (metres). */
export const PRODUCT_LATERAL_BUFFER_SIDE_M = 0.005;

/** Extra width/depth reserved per product slot (metres). */
export const PRODUCT_LATERAL_BUFFER_TOTAL_M = 0.01;

/** Fixed bay reserve at segment ends (both sides combined). */
export const PRODUCT_LATERAL_BUFFER_BAY_RESERVE_M = 0.01;

export function productSlotWidthMeters(productWidthMeters) {
  const w = Number(productWidthMeters) || 0;
  if (w <= 0) return 0;
  return w + PRODUCT_LATERAL_BUFFER_TOTAL_M;
}

export function productSlotDepthMeters(productDepthMeters) {
  const d = Number(productDepthMeters) || 0;
  if (d <= 0) return 0;
  return d + PRODUCT_LATERAL_BUFFER_TOTAL_M;
}

/**
 * Max front facings: floor((U − bayReserve) / (W + buffer)).
 * @param {number} usableWidthMeters
 * @param {number} productWidthMeters
 */
export function computeMaxFacings(usableWidthMeters, productWidthMeters) {
  const usable = Number(usableWidthMeters) || 0;
  const pw = Number(productWidthMeters) || 0;
  if (usable <= 0 || pw <= 0) return 0;
  const net = usable - PRODUCT_LATERAL_BUFFER_BAY_RESERVE_M;
  if (net <= 0) return 0;
  const slot = productSlotWidthMeters(pw);
  return Math.max(0, Math.floor(net / slot + 1e-9));
}

/** Max depth facings with the same lateral buffer rule along shelf depth. */
export function computeMaxDepthFacings(shelfDepthMeters, productDepthMeters) {
  const depth = Number(shelfDepthMeters) || 0;
  const pd = Number(productDepthMeters) || 0;
  if (depth <= 0 || pd <= 0) return 0;
  const net = depth - PRODUCT_LATERAL_BUFFER_BAY_RESERVE_M;
  if (net <= 0) return 0;
  const slot = productSlotDepthMeters(pd);
  return Math.max(0, Math.floor(net / slot + 1e-9));
}

/** Usable width inside one facing slot after lateral buffer. */
export function facingWidthInSlot(slotWidthMeters, productWidthMeters) {
  const slot = Math.max(0, Number(slotWidthMeters) || 0);
  const pw = Number(productWidthMeters) || 0;
  if (slot <= 0 || pw <= 0) return 0;
  return Math.max(0, Math.min(pw, slot - PRODUCT_LATERAL_BUFFER_TOTAL_M));
}
