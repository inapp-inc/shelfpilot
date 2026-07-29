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

export function layoutStoreEnvelope(layout) {
  const w = Number(layout?.widthMeters) || 10;
  const d = Number(layout?.depthMeters) || 8;
  const raw = layout?.storeEnvelope;
  if (raw && typeof raw === "object") {
    return {
      x: Number(raw.x) || 0,
      y: Number(raw.y) || 0,
      widthMeters: Number(raw.widthMeters) || w,
      depthMeters: Number(raw.depthMeters) || d,
    };
  }
  return { x: 0, y: 0, widthMeters: w, depthMeters: d };
}

export function layoutCanvasBounds(layout) {
  const envelope = layoutStoreEnvelope(layout);
  const poly =
    layout?.shape === "polygon" && layout.polygon?.length >= 3 ? layout.polygon : null;
  if (poly) {
    const aabb = polygonAabb(poly);
    const envMaxX = envelope.x + envelope.widthMeters;
    const envMaxY = envelope.y + envelope.depthMeters;
    const minX = Math.min(envelope.x, aabb.minX);
    const minY = Math.min(envelope.y, aabb.minY);
    const maxX = Math.max(envMaxX, aabb.maxX);
    const maxY = Math.max(envMaxY, aabb.maxY);
    return {
      minX,
      minY,
      maxX,
      maxY,
      width: Math.max(0.1, maxX - minX),
      height: Math.max(0.1, maxY - minY),
      polygon: poly,
      storeEnvelope: envelope,
      strict: true,
    };
  }
  const w = envelope.widthMeters;
  const d = envelope.depthMeters;
  return {
    minX: envelope.x,
    minY: envelope.y,
    maxX: envelope.x + w,
    maxY: envelope.y + d,
    width: w,
    height: d,
    polygon: null,
    storeEnvelope: envelope,
    strict: false,
  };
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

function rectFullyInsidePolygon(x, y, w, d, poly) {
  if (!poly?.length || w <= 0 || d <= 0) return false;
  const step = Math.min(0.25, Math.max(0.05, Math.min(w, d) / 4));
  const cols = Math.max(1, Math.ceil(w / step));
  const rows = Math.max(1, Math.ceil(d / step));
  for (let i = 0; i <= cols; i += 1) {
    for (let j = 0; j <= rows; j += 1) {
      const px = x + (w * i) / cols;
      const py = y + (d * j) / rows;
      if (!pointInPolygon(px, py, poly)) return false;
    }
  }
  return true;
}

export function shelfLocalMeters(shelf) {
  return {
    w: Number(shelf.usableWidthMeters ?? shelf.widthMeters) || 1.2,
    d: Number(shelf.depthMeters) || 0.6,
  };
}

export function shelfRotatedCorners(shelf) {
  const cx = Number(shelf.x) || 0;
  const cy = Number(shelf.y) || 0;
  const { w, d } = shelfLocalMeters(shelf);
  const rad = (((Number(shelf.rotationDeg) || 0) % 360) + 360) % 360 * (Math.PI / 180);
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return [
    [0, 0],
    [w, 0],
    [w, d],
    [0, d],
  ].map(([lx, ly]) => ({
    x: cx + lx * cos - ly * sin,
    y: cy + lx * sin + ly * cos,
  }));
}

export function shelfFitsPolygon(shelf, poly) {
  if (!poly?.length) return true;
  return shelfRotatedCorners(shelf).every((c) => pointInPolygon(c.x, c.y, poly));
}

export function aisleFootprintMeters(aisle, layout) {
  const aw = Math.max(0.4, Number(aisle.widthMeters) || 1);
  const len =
    aisle.lengthMeters != null
      ? Number(aisle.lengthMeters)
      : Math.max(2, (Number(layout?.widthMeters) || 10) * 0.35);
  const x = Number(aisle.x) || 0;
  const y = Number(aisle.y) || 0;
  if (aisle.orientation === "vertical") {
    return { x, y, w: aw, d: len };
  }
  return { x, y, w: len, d: aw };
}

export function entityFitsPolygon(entity, kind, bounds, layout) {
  const poly = bounds.polygon;
  if (kind === "shelf") {
    if (!poly) {
      const { w, d } = shelfLocalMeters(entity);
      const x = Number(entity.x) || 0;
      const y = Number(entity.y) || 0;
      return (
        x >= bounds.minX - 1e-6 &&
        y >= bounds.minY - 1e-6 &&
        x + w <= bounds.maxX + 1e-6 &&
        y + d <= bounds.maxY + 1e-6
      );
    }
    return shelfFitsPolygon(entity, poly);
  }
  if (kind === "aisle") {
    const fp = aisleFootprintMeters(entity, layout);
    if (!poly) {
      return (
        fp.x >= bounds.minX - 1e-6 &&
        fp.y >= bounds.minY - 1e-6 &&
        fp.x + fp.w <= bounds.maxX + 1e-6 &&
        fp.y + fp.d <= bounds.maxY + 1e-6
      );
    }
    return rectFullyInsidePolygon(fp.x, fp.y, fp.w, fp.d, poly);
  }
  return true;
}

/** Shrink horizontal run length until aisle footprint fits polygon. */
export function maxLengthInsideX(x, y, maxLen, depth, poly, step = 0.1) {
  if (!poly?.length) return maxLen;
  const minLen = 0.5;
  for (let len = maxLen; len >= minLen; len = Number((len - step).toFixed(2))) {
    if (rectFullyInsidePolygon(x, y, len, depth, poly)) return len;
  }
  return 0;
}

/** Shrink vertical run length until aisle footprint fits polygon. */
export function maxLengthInsideY(x, y, width, maxLen, poly, step = 0.1) {
  if (!poly?.length) return maxLen;
  const minLen = 0.5;
  for (let len = maxLen; len >= minLen; len = Number((len - step).toFixed(2))) {
    if (rectFullyInsidePolygon(x, y, width, len, poly)) return len;
  }
  return 0;
}

/** Longest aisle run from anchor inside floor bounds / polygon. */
export function defaultAisleRun(bounds, x, y, orientation, widthMeters) {
  const poly = bounds.polygon;
  const span = orientation === "vertical" ? bounds.height : bounds.width;
  const maxLen = Math.max(1, span - 0.2);
  if (orientation === "vertical") {
    const len = poly ? maxLengthInsideY(x, y, widthMeters, maxLen, poly) : maxLen;
    return Math.max(1, len || maxLen * 0.85);
  }
  const len = poly ? maxLengthInsideX(x, y, maxLen, widthMeters, poly) : maxLen;
  return Math.max(1, len || maxLen * 0.85);
}

function pointInAabb(px, py, rect, eps = 1e-6) {
  return (
    px >= rect.x - eps &&
    px <= rect.x + rect.w + eps &&
    py >= rect.y - eps &&
    py <= rect.y + rect.d + eps
  );
}

function pointInShelfLocal(lx, ly, w, d, eps = 1e-6) {
  return lx >= -eps && lx <= w + eps && ly >= -eps && ly <= d + eps;
}

function worldToShelfLocal(px, py, shelf) {
  const cx = Number(shelf.x) || 0;
  const cy = Number(shelf.y) || 0;
  const rad = -((((Number(shelf.rotationDeg) || 0) % 360) + 360) % 360) * (Math.PI / 180);
  const dx = px - cx;
  const dy = py - cy;
  return {
    x: dx * Math.cos(rad) - dy * Math.sin(rad),
    y: dx * Math.sin(rad) + dy * Math.cos(rad),
  };
}

function aabbOverlap(a, b, eps = 1e-6) {
  return !(
    a.x + a.w <= b.x + eps ||
    b.x + b.w <= a.x + eps ||
    a.y + a.d <= b.y + eps ||
    b.y + b.d <= a.y + eps
  );
}

function shelfFootprintAabb(shelf) {
  const corners = shelfRotatedCorners(shelf);
  const xs = corners.map((c) => c.x);
  const ys = corners.map((c) => c.y);
  return {
    x: Math.min(...xs),
    y: Math.min(...ys),
    w: Math.max(...xs) - Math.min(...xs),
    d: Math.max(...ys) - Math.min(...ys),
  };
}

function shelfOverlapsAisleRect(shelf, aisleRect) {
  const { w, d } = shelfLocalMeters(shelf);
  const sf = shelfFootprintAabb(shelf);
  if (!aabbOverlap(sf, aisleRect)) return false;
  if (shelfRotatedCorners(shelf).some((c) => pointInAabb(c.x, c.y, aisleRect))) return true;
  const aisleCorners = [
    { x: aisleRect.x, y: aisleRect.y },
    { x: aisleRect.x + aisleRect.w, y: aisleRect.y },
    { x: aisleRect.x + aisleRect.w, y: aisleRect.y + aisleRect.d },
    { x: aisleRect.x, y: aisleRect.y + aisleRect.d },
  ];
  if (
    aisleCorners.some((c) => {
      const local = worldToShelfLocal(c.x, c.y, shelf);
      return pointInShelfLocal(local.x, local.y, w, d);
    })
  ) {
    return true;
  }
  return aabbOverlap(sf, aisleRect);
}

export function entityOverlapsLayout(entity, kind, layout, { ignoreId } = {}) {
  const shelves = layout.shelves?.length ? layout.shelves : layout.fixtures || [];
  if (kind === "aisle") {
    const aisleRect = aisleFootprintMeters(entity, layout);
    for (const shelf of shelves) {
      if (ignoreId && shelf.id === ignoreId) continue;
      if (shelfOverlapsAisleRect(shelf, aisleRect)) return true;
    }
    return false;
  }
  if (kind === "shelf") {
    for (const aisle of layout.aisles || []) {
      if (ignoreId && aisle.id === ignoreId) continue;
      if (shelfOverlapsAisleRect(entity, aisleFootprintMeters(aisle, layout))) return true;
    }
    return false;
  }
  return false;
}

export function entityPlacementValid(entity, kind, bounds, layout, { ignoreId } = {}) {
  return entityFitsPolygon(entity, kind, bounds, layout) && !entityOverlapsLayout(entity, kind, layout, { ignoreId });
}
