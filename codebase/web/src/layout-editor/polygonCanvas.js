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

/** True when fixture polygon is clearly inset inside the store envelope (nested layout). */
export function fixtureZoneDistinctFromEnvelope(poly, envelope, marginMeters = 0.5) {
  if (!poly?.length || !envelope) return false;
  const aabb = polygonAabb(poly);
  if (!aabb) return false;
  const ex = Number(envelope.x) || 0;
  const ey = Number(envelope.y) || 0;
  const ew = Number(envelope.widthMeters) || 0;
  const ed = Number(envelope.depthMeters) || 0;
  const m = marginMeters;
  const insetLeft = aabb.minX - ex;
  const insetTop = aabb.minY - ey;
  const insetRight = ex + ew - aabb.maxX;
  const insetBottom = ey + ed - aabb.maxY;
  return insetLeft > m || insetTop > m || insetRight > m || insetBottom > m;
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

/** Axis-aligned rectangle polygon (clockwise from top-left in store coords). */
export function rectanglePolygon(x, y, widthMeters, depthMeters) {
  const w = Number(widthMeters) || 0;
  const d = Number(depthMeters) || 0;
  return [
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + d },
    { x, y: y + d },
  ];
}

/** True when every vertex of the polygon lies inside the store envelope. */
export function polygonInsideEnvelope(poly, envelope) {
  if (!poly?.length || !envelope) return false;
  const maxX = envelope.x + envelope.widthMeters;
  const maxY = envelope.y + envelope.depthMeters;
  return poly.every((p) => {
    const px = Number(p.x);
    const py = Number(p.y);
    return px >= envelope.x && px <= maxX && py >= envelope.y && py <= maxY;
  });
}

/**
 * Resize a rectangle inside an envelope, keeping its centre fixed (all 4 edges move equally).
 */
export function fitRectanglePolygonInEnvelope(envelope, widthMeters, depthMeters, existingPoly) {
  if (!envelope) return null;
  const ex = Number(envelope.x) || 0;
  const ey = Number(envelope.y) || 0;
  const ew = Number(envelope.widthMeters) || 10;
  const ed = Number(envelope.depthMeters) || 8;
  const w = Math.min(Math.max(0.5, Number(widthMeters) || 0.5), ew);
  const d = Math.min(Math.max(0.5, Number(depthMeters) || 0.5), ed);

  let cx = ex + ew / 2;
  let cy = ey + ed / 2;
  if (existingPoly?.length >= 3) {
    const aabb = polygonAabb(existingPoly);
    if (aabb) {
      cx = (aabb.minX + aabb.maxX) / 2;
      cy = (aabb.minY + aabb.maxY) / 2;
    }
  }

  let ox = cx - w / 2;
  let oy = cy - d / 2;

  // Keep fully inside envelope (centre shifts only when clamped at edges).
  ox = Math.max(ex, Math.min(ox, ex + ew - w));
  oy = Math.max(ey, Math.min(oy, ey + ed - d));

  return rectanglePolygon(ox, oy, w, d);
}

/** Resize store envelope from its centre (± on all four sides). */
export function centeredStoreEnvelope(oldEnvelope, widthMeters, depthMeters) {
  const prev = oldEnvelope || { x: 0, y: 0, widthMeters: 10, depthMeters: 8 };
  const w = Math.max(1, Number(widthMeters) || prev.widthMeters);
  const d = Math.max(1, Number(depthMeters) || prev.depthMeters);
  const cx = (Number(prev.x) || 0) + (Number(prev.widthMeters) || w) / 2;
  const cy = (Number(prev.y) || 0) + (Number(prev.depthMeters) || d) / 2;
  return {
    x: cx - w / 2,
    y: cy - d / 2,
    widthMeters: w,
    depthMeters: d,
  };
}

/** Saved fixture-zone polygon (3+ vertices), regardless of layout.shape label. */
export function layoutFixturePolygon(layout) {
  return layout?.polygon?.length >= 3 ? layout.polygon : null;
}

export function polygonDimensions(poly) {
  const aabb = polygonAabb(poly);
  if (!aabb) return null;
  return { w: aabb.width, d: aabb.height };
}

const MIN_FIXTURE_DIM = 0.5;

/** Force fixture polygon to axis-aligned rectangle (for W×D editing). */
export function normalizeFixtureRectangle(poly) {
  const aabb = polygonAabb(poly);
  if (!aabb) return null;
  return rectanglePolygon(aabb.minX, aabb.minY, aabb.width, aabb.height);
}

function clampFixtureAabb(minX, minY, maxX, maxY, envelope) {
  const ex = Number(envelope?.x) || 0;
  const ey = Number(envelope?.y) || 0;
  const eMaxX = ex + (Number(envelope?.widthMeters) || 0);
  const eMaxY = ey + (Number(envelope?.depthMeters) || 0);
  let x1 = Math.max(ex, Math.min(minX, eMaxX - MIN_FIXTURE_DIM));
  let y1 = Math.max(ey, Math.min(minY, eMaxY - MIN_FIXTURE_DIM));
  let x2 = Math.max(x1 + MIN_FIXTURE_DIM, Math.min(maxX, eMaxX));
  let y2 = Math.max(y1 + MIN_FIXTURE_DIM, Math.min(maxY, eMaxY));
  return { minX: x1, minY: y1, maxX: x2, maxY: y2 };
}

function rectPolyFromBounds(minX, minY, maxX, maxY) {
  return rectanglePolygon(minX, minY, maxX - minX, maxY - minY);
}

/** Drag a corner handle — keeps an axis-aligned fixture rectangle. */
export function resizeFixtureRectCorner(aabb, cornerIndex, x, y, envelope) {
  if (!aabb) return null;
  let { minX, minY, maxX, maxY } = aabb;
  const px = Number(x);
  const py = Number(y);
  if (cornerIndex === 0) {
    minX = px;
    minY = py;
  } else if (cornerIndex === 1) {
    maxX = px;
    minY = py;
  } else if (cornerIndex === 2) {
    maxX = px;
    maxY = py;
  } else {
    minX = px;
    maxY = py;
  }
  const b = clampFixtureAabb(minX, minY, maxX, maxY, envelope);
  return rectPolyFromBounds(b.minX, b.minY, b.maxX, b.maxY);
}

/** Drag an edge handle — resizes one side of the fixture rectangle. */
export function resizeFixtureRectEdge(aabb, edgeIndex, x, y, envelope) {
  if (!aabb) return null;
  let { minX, minY, maxX, maxY } = aabb;
  const px = Number(x);
  const py = Number(y);
  if (edgeIndex === 0) minY = py;
  else if (edgeIndex === 1) maxX = px;
  else if (edgeIndex === 2) maxY = py;
  else minX = px;
  const b = clampFixtureAabb(minX, minY, maxX, maxY, envelope);
  return rectPolyFromBounds(b.minX, b.minY, b.maxX, b.maxY);
}

/** Axis-aligned fixture zone (product area) inside the store envelope. */
export function layoutFixtureZoneRect(layout, previewPoly = null) {
  const env = layoutStoreEnvelope(layout);
  const poly = layoutFixturePolygon(layout) || previewPoly;
  if (poly?.length >= 3) {
    const aabb = polygonAabb(poly);
    if (aabb) {
      return {
        x: aabb.minX,
        y: aabb.minY,
        widthMeters: aabb.width,
        depthMeters: aabb.height,
      };
    }
  }
  const w = Number(layout?.widthMeters) || env.widthMeters;
  const d = Number(layout?.depthMeters) || env.depthMeters;
  const fitted = fitRectanglePolygonInEnvelope(env, w, d, layout?.polygon);
  if (fitted?.length >= 3) {
    const aabb = polygonAabb(fitted);
    if (aabb) {
      return {
        x: aabb.minX,
        y: aabb.minY,
        widthMeters: aabb.width,
        depthMeters: aabb.height,
      };
    }
  }
  return {
    x: env.x,
    y: env.y,
    widthMeters: Math.min(w, env.widthMeters),
    depthMeters: Math.min(d, env.depthMeters),
  };
}

/** Tight bounds around generated fixtures — shelves, aisles, and fixture zone (not full store envelope). */
export function layoutContentBounds(layout, previewPoly = null) {
  if (!layout) return null;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const expand = (x, y, w, d) => {
    if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(w) || !Number.isFinite(d)) return;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x + w);
    maxY = Math.max(maxY, y + d);
  };

  const shelves = layout.shelves?.length ? layout.shelves : layout.fixtures || [];
  const seenPairs = new Set();
  for (const s of shelves) {
    if (s.pairId) {
      if (seenPairs.has(s.pairId)) continue;
      const mate = shelves.find((x) => x.pairId === s.pairId && x.id !== s.id);
      if (mate) {
        seenPairs.add(s.pairId);
        const front = s.pairRole === "back" ? mate : s;
        const back = s.pairRole === "back" ? s : mate;
        const aabb = gondolaCanvasAabb(front, back);
        expand(aabb.x, aabb.y, aabb.w, aabb.d);
        continue;
      }
    }
    const aabb = shelfCanvasAabb(s);
    expand(aabb.x, aabb.y, aabb.w, aabb.d);
  }

  for (const a of layout.aisles || []) {
    const fp = aisleFootprintMeters(a, layout);
    expand(fp.x, fp.y, fp.w, fp.d);
  }

  if (Number.isFinite(minX)) {
    return { minX, minY, maxX, maxY };
  }

  const fz = layoutFixtureZoneRect(layout, previewPoly);
  return {
    minX: fz.x,
    minY: fz.y,
    maxX: fz.x + fz.widthMeters,
    maxY: fz.y + fz.depthMeters,
  };
}

/** Floor polygon for rendering: saved fixture zone, or layout size when none drawn yet. */
export function layoutFloorPolygon(layout, previewPoly = null) {
  const rect = layoutFixtureZoneRect(layout, previewPoly);
  return rectanglePolygon(rect.x, rect.y, rect.widthMeters, rect.depthMeters);
}

export function layoutCanvasBounds(layout, options = {}) {
  const envelope = layoutStoreEnvelope(layout);
  const savedPoly = layoutFixturePolygon(layout);
  const previewPoly = options.previewPoly?.length >= 3 ? options.previewPoly : null;

  let minX = envelope.x;
  let minY = envelope.y;
  let maxX = envelope.x + envelope.widthMeters;
  let maxY = envelope.y + envelope.depthMeters;

  const fixturePoly = savedPoly || previewPoly;
  if (options.expandToEnvelope && fixturePoly?.length >= 3) {
    const aabb = polygonAabb(fixturePoly);
    if (aabb) {
      minX = Math.min(minX, aabb.minX);
      minY = Math.min(minY, aabb.minY);
      maxX = Math.max(maxX, aabb.maxX);
      maxY = Math.max(maxY, aabb.maxY);
    }
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: Math.max(0.1, maxX - minX),
    height: Math.max(0.1, maxY - minY),
    polygon: savedPoly,
    storeEnvelope: envelope,
    strict: Boolean(savedPoly?.length >= 3),
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

/** Axis-aligned bounds of a rotated shelf in layout metres. */
export function shelfCanvasAabb(shelf) {
  const corners = shelfRotatedCorners(shelf);
  const xs = corners.map((c) => c.x);
  const ys = corners.map((c) => c.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  return {
    x: minX,
    y: minY,
    w: Math.max(0.05, maxX - minX),
    d: Math.max(0.05, maxY - minY),
    originX: Number(shelf.x) || 0,
    originY: Number(shelf.y) || 0,
  };
}

/** Union AABB for a gondola front+back pair. */
export function gondolaCanvasAabb(front, back) {
  const corners = [...shelfRotatedCorners(front), ...shelfRotatedCorners(back)];
  const xs = corners.map((c) => c.x);
  const ys = corners.map((c) => c.y);
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const maxX = Math.max(...xs);
  const maxY = Math.max(...ys);
  return {
    x: minX,
    y: minY,
    w: Math.max(0.05, maxX - minX),
    d: Math.max(0.05, maxY - minY),
    originX: Number(front.x) || 0,
    originY: Number(front.y) || 0,
  };
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
