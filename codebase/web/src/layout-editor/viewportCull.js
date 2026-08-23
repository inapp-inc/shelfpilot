/** World-space viewport helpers for Canvas2D entity culling (Phase 3.3). */

export const VIEWPORT_CULL_MIN_ENTITIES = 60;
export const VIEWPORT_CULL_MARGIN_M = 2;

export function worldViewportFromStage({
  scrollLeft = 0,
  scrollTop = 0,
  clientWidth = 0,
  clientHeight = 0,
  scale = 1,
  bounds,
  paddingPx = 24,
  marginM = VIEWPORT_CULL_MARGIN_M,
}) {
  if (!bounds || !scale) return null;
  const minX = bounds.minX + (scrollLeft - paddingPx) / scale - marginM;
  const minY = bounds.minY + (scrollTop - paddingPx) / scale - marginM;
  const maxX = bounds.minX + (scrollLeft + clientWidth - paddingPx) / scale + marginM;
  const maxY = bounds.minY + (scrollTop + clientHeight - paddingPx) / scale + marginM;
  return { minX, minY, maxX, maxY };
}

export function aabbIntersectsViewport(aabb, viewport) {
  if (!aabb || !viewport) return true;
  const minX = aabb.minX ?? aabb.x ?? 0;
  const minY = aabb.minY ?? aabb.y ?? 0;
  const maxX = aabb.maxX ?? minX + (aabb.w ?? aabb.widthMeters ?? 0);
  const maxY = aabb.maxY ?? minY + (aabb.h ?? aabb.depthMeters ?? 0);
  return !(maxX < viewport.minX || minX > viewport.maxX || maxY < viewport.minY || minY > viewport.maxY);
}

export function shouldCullCanvasEntities(entityCount) {
  return entityCount >= VIEWPORT_CULL_MIN_ENTITIES;
}
