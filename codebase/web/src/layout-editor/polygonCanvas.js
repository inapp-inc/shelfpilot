/** Polygon viewport helpers for strict fixture-zone canvas. */

export function polygonAabb(poly) {
  if (!poly?.length) return null;
  const xs = poly.map((p) => Number(p.x));
  const ys = poly.map((p) => Number(p.y));
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return {
    minX,
    minY,
    maxX,
    maxY,
    width: Math.max(0.1, maxX - minX),
    height: Math.max(0.1, maxY - minY),
  };
}

export function layoutCanvasBounds(layout) {
  const poly =
    layout?.shape === "polygon" && layout.polygon?.length >= 3 ? layout.polygon : null;
  if (poly) {
    const aabb = polygonAabb(poly);
    return { ...aabb, polygon: poly, strict: true };
  }
  const w = Number(layout?.widthMeters) || 10;
  const d = Number(layout?.depthMeters) || 8;
  return { minX: 0, minY: 0, maxX: w, maxY: d, width: w, height: d, polygon: null, strict: false };
}

export function pointInPolygon(x, y, poly) {
  if (!poly?.length) return true;
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x;
    const yi = poly[i].y;
    const xj = poly[j].x;
    const yj = poly[j].y;
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function toStageCoords(x, y, bounds) {
  return { x: x - bounds.minX, y: y - bounds.minY };
}

export function fromStageCoords(sx, sy, bounds) {
  return { x: sx + bounds.minX, y: sy + bounds.minY };
}
