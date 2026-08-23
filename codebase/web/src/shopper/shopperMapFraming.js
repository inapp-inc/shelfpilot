/** View-box framing for the kiosk map: the store plan always fits the host, like the layout editor. */

/** Pixels per metre so a layout bounds box fills a host, with a small margin. */
export function fitLayoutScale(bounds, hostWidth, hostHeight, padPx = 8) {
  const w = Number(bounds?.width) || 0;
  const h = Number(bounds?.height) || 0;
  const availW = Math.max(0, Number(hostWidth) - padPx * 2);
  const availH = Math.max(0, Number(hostHeight) - padPx * 2);
  if (w <= 0 || h <= 0 || availW <= 0 || availH <= 0) return 0;
  return Math.max(0.5, Math.min(availW / w, availH / h));
}

/** Smallest framed span (metres) in guided mode, so a short route still reads as a store. */
export const MIN_GUIDED_SPAN_M = 12;

/**
 * A guided frame never drops below this share of the full store span. A route that covers one
 * corner of the store would otherwise zoom until the shopper loses all sense of where they are.
 * Stores up to GUIDED_ZOOM_SPAN_M wide keep their whole plan on screen.
 */
export const MIN_GUIDED_STORE_SHARE = 1;

/** Above this span (metres) the whole plan is too large to read, so guided mode zooms to the route. */
export const GUIDED_ZOOM_SPAN_M = 60;

/** Share of a very large store to show around the route. */
export const LARGE_STORE_GUIDED_SHARE = 0.6;

/** Guided zoom level for a store of this span — full plan for normal stores, partial for huge ones. */
export function guidedStoreShare(spanMeters) {
  return Number(spanMeters) > GUIDED_ZOOM_SPAN_M ? LARGE_STORE_GUIDED_SHARE : MIN_GUIDED_STORE_SHARE;
}

/** Keep a frame inside the store when it is small enough to fit, so we never pan off the plan. */
export function clampViewBoxToBounds(vb, bounds) {
  if (!bounds) return vb;
  let { minX, minY, width, height } = vb;
  const boundsW = bounds.maxX - bounds.minX;
  const boundsH = bounds.maxY - bounds.minY;
  if (width <= boundsW) minX = Math.min(Math.max(minX, bounds.minX), bounds.maxX - width);
  else minX = bounds.minX + (boundsW - width) / 2;
  if (height <= boundsH) minY = Math.min(Math.max(minY, bounds.minY), bounds.maxY - height);
  else minY = bounds.minY + (boundsH - height) / 2;
  return { minX, minY, width, height };
}

/** Widen or tallen the view box so the content fits a screen aspect ratio (letterbox in user space). */
export function fitViewBoxToAspect(vb, aspectRatio) {
  if (!vb || !aspectRatio || aspectRatio <= 0) return vb;
  const cx = vb.minX + vb.width / 2;
  const cy = vb.minY + vb.height / 2;
  let width = vb.width;
  let height = vb.height;
  const contentAspect = width / Math.max(height, 0.01);

  if (contentAspect < aspectRatio) {
    width = height * aspectRatio;
  } else if (contentAspect > aspectRatio) {
    height = width / aspectRatio;
  }

  return { minX: cx - width / 2, minY: cy - height / 2, width, height };
}

/** Keep the full layout in frame while ensuring route / pin points stay visible. */
export function expandViewBoxForPoints(vb, points = [], pad = 0.9) {
  if (!vb) return vb;
  let minX = vb.minX;
  let minY = vb.minY;
  let maxX = vb.minX + vb.width;
  let maxY = vb.minY + vb.height;
  for (const p of points) {
    if (p?.x == null || p?.y == null) continue;
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  return { minX: minX - pad, minY: minY - pad, width: maxX - minX + pad * 2, height: maxY - minY + pad * 2 };
}

/**
 * Frame the walking route for guided mode: the entrance (with its plaza), every route vertex,
 * the destination pin and the target fixture. The frame is padded, never smaller than
 * MIN_GUIDED_SPAN_M or MIN_GUIDED_STORE_SHARE of the store, and stays over the plan.
 *
 * @param targetAabb {{ x, y, w, h }} target fixture footprint, if any
 */
export function focusViewBoxForGuidedRoute(
  vb,
  route,
  entryPoint,
  markerPoint,
  targetAabb,
  { minSpanMeters = MIN_GUIDED_SPAN_M, storeShare = MIN_GUIDED_STORE_SHARE } = {}
) {
  if (!route?.length) return vb;

  const pts = [...route];
  if (entryPoint) {
    pts.push({ x: Number(entryPoint.x), y: Number(entryPoint.y) });
    const plaza = entryPoint.plaza;
    if (plaza) pts.push({ x: plaza.x, y: plaza.y }, { x: plaza.x + plaza.w, y: plaza.y + plaza.d });
  }
  if (markerPoint) pts.push(markerPoint);
  if (targetAabb) {
    pts.push(
      { x: targetAabb.x, y: targetAabb.y },
      { x: targetAabb.x + targetAabb.w, y: targetAabb.y + targetAabb.h }
    );
  }

  let box = null;
  for (const p of pts) {
    const x = Number(p?.x);
    const y = Number(p?.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    box = box
      ? {
          minX: Math.min(box.minX, x),
          minY: Math.min(box.minY, y),
          maxX: Math.max(box.maxX, x),
          maxY: Math.max(box.maxY, y),
        }
      : { minX: x, minY: y, maxX: x, maxY: y };
  }
  if (!box) return vb;

  const contentW = box.maxX - box.minX;
  const contentH = box.maxY - box.minY;
  const pad = Math.max(1.2, Math.max(contentW, contentH) * 0.075);
  const share = Math.min(1, Math.max(0, storeShare));
  const width = Math.max(contentW + pad * 2, minSpanMeters, vb.width * share);
  const height = Math.max(contentH + pad * 2, minSpanMeters, vb.height * share);
  const cx = (box.minX + box.maxX) / 2;
  const cy = (box.minY + box.maxY) / 2;

  return clampViewBoxToBounds(
    { minX: cx - width / 2, minY: cy - height / 2, width, height },
    { minX: vb.minX, minY: vb.minY, maxX: vb.minX + vb.width, maxY: vb.minY + vb.height }
  );
}
