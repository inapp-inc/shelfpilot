/**
 * Polygon containment for layout aisles/shelves (strict).
 */

const MAX_VERTICES = 64;

/**
 * Fixture-zone boundary for packing / containment.
 * Prefer an explicit polygon whenever present (matches UI fixture zone),
 * even if layout.shape was left as "rectangle".
 */
export function layoutBoundaryPolygon(layout) {
  if (Array.isArray(layout?.polygon) && layout.polygon.length >= 3) {
    return layout.polygon.map((p) => ({ x: Number(p.x), y: Number(p.y) }));
  }
  const raw = layout?.storeEnvelope;
  const x = raw && typeof raw === "object" ? Number(raw.x) || 0 : 0;
  const y = raw && typeof raw === "object" ? Number(raw.y) || 0 : 0;
  const w =
    raw && typeof raw === "object"
      ? Number(raw.widthMeters) || Number(layout?.widthMeters) || 0
      : Number(layout?.widthMeters) || 0;
  const d =
    raw && typeof raw === "object"
      ? Number(raw.depthMeters) || Number(layout?.depthMeters) || 0
      : Number(layout?.depthMeters) || 0;
  return [
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + d },
    { x, y: y + d },
  ];
}

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

export function storeEnvelopeFromLayout(layout) {
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

/** Resize a rectangle inside an envelope, keeping its centre fixed. */
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
  ox = Math.max(ex, Math.min(ox, ex + ew - w));
  oy = Math.max(ey, Math.min(oy, ey + ed - d));

  return rectanglePolygon(ox, oy, w, d);
}

/** Keep fixture polygon inside the store envelope; sync layout dimensions. */
export function alignLayoutGeometry(layout) {
  if (!layout) return layout;
  const env = storeEnvelopeFromLayout(layout);
  layout.storeEnvelope = env;
  layout.widthMeters = env.widthMeters;
  layout.depthMeters = env.depthMeters;

  const poly = layout.polygon;
  if (poly?.length >= 3 && !polygonInsideEnvelope(poly, env)) {
    const aabb = polygonAabb(poly);
    const fitted = fitRectanglePolygonInEnvelope(
      env,
      aabb?.width ?? env.widthMeters,
      aabb?.height ?? env.depthMeters,
      poly
    );
    if (fitted) {
      layout.polygon = fitted;
      layout.shape = "polygon";
    }
  }
  return layout;
}

export function validatePolygonRing(polygon) {
  if (!Array.isArray(polygon)) return { ok: false, error: "invalid_polygon" };
  if (polygon.length === 0) return { ok: true };
  if (polygon.length < 3) return { ok: false, error: "invalid_polygon" };
  if (polygon.length > MAX_VERTICES) return { ok: false, error: "polygon_too_many_vertices" };
  for (const p of polygon) {
    if (!Number.isFinite(Number(p?.x)) || !Number.isFinite(Number(p?.y))) {
      return { ok: false, error: "invalid_polygon" };
    }
  }
  return { ok: true };
}

function pointOnSegment(p, a, b, eps = 1e-6) {
  const cross = (p.y - a.y) * (b.x - a.x) - (p.x - a.x) * (b.y - a.y);
  if (Math.abs(cross) > eps) return false;
  const dot = (p.x - a.x) * (b.x - a.x) + (p.y - a.y) * (b.y - a.y);
  if (dot < -eps) return false;
  const lenSq = (b.x - a.x) ** 2 + (b.y - a.y) ** 2;
  return dot <= lenSq + eps;
}

/** Ray-casting; boundary counts as inside. */
export function pointInPolygon(point, polygon) {
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    if (pointOnSegment(point, polygon[i], polygon[j])) return true;
  }
  const x = point.x;
  const y = point.y;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    if (yi > y !== yj > y) {
      const den = yj - yi;
      if (den === 0) continue;
      const xInter = ((xj - xi) * (y - yi)) / den + xi;
      if (x < xInter) inside = !inside;
    }
  }
  return inside;
}

export function rectCorners(x, y, w, d) {
  return [
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + d },
    { x, y: y + d },
  ];
}

export function rectFullyInsidePolygon(x, y, w, d, polygon) {
  if (!polygon?.length || w <= 0 || d <= 0) return false;
  const step = Math.min(0.25, Math.max(0.05, Math.min(w, d) / 4));
  const cols = Math.max(1, Math.ceil(w / step));
  const rows = Math.max(1, Math.ceil(d / step));
  for (let i = 0; i <= cols; i += 1) {
    for (let j = 0; j <= rows; j += 1) {
      const px = x + (w * i) / cols;
      const py = y + (d * j) / rows;
      if (!pointInPolygon({ x: px, y: py }, polygon)) return false;
    }
  }
  return true;
}

/** Shrink length along X until footprint fits (or return 0). */
export function maxLengthInsideX(x, y, maxLen, depth, polygon, step = 0.1) {
  const minLen = 0.5;
  for (let len = maxLen; len >= minLen; len = Number((len - step).toFixed(2))) {
    if (rectFullyInsidePolygon(x, y, len, depth, polygon)) return len;
  }
  return 0;
}

/** Shrink length along Y (rect width=depth along X, length along Y). */
export function maxLengthInsideY(x, y, width, maxLen, polygon, step = 0.1) {
  const minLen = 0.5;
  for (let len = maxLen; len >= minLen; len = Number((len - step).toFixed(2))) {
    if (rectFullyInsidePolygon(x, y, width, len, polygon)) return len;
  }
  return 0;
}

/** Local W×D in meters (unrotated shelf run × depth). */
export function shelfLocalSize(shelf) {
  const usable = Number(shelf.usableWidthMeters ?? shelf.widthMeters) || 0;
  const depth = Number(shelf.depthMeters) || 0;
  return { w: usable || 1.2, d: depth || 0.6 };
}

/** Rotated corner points in layout coordinates. */
export function shelfRotatedCorners(shelf) {
  const cx = Number(shelf.x) || 0;
  const cy = Number(shelf.y) || 0;
  const { w, d } = shelfLocalSize(shelf);
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

/** Floor-plan footprint in meters (supports arbitrary rotationDeg). */
export function shelfFloorFootprint(shelf) {
  const corners = shelfRotatedCorners(shelf);
  const xs = corners.map((c) => c.x);
  const ys = corners.map((c) => c.y);
  return {
    corners,
    x: Math.min(...xs),
    y: Math.min(...ys),
    w: Math.max(...xs) - Math.min(...xs),
    d: Math.max(...ys) - Math.min(...ys),
  };
}

export function shelfFootprint(shelf) {
  const { x, y, w, d } = shelfFloorFootprint(shelf);
  return { x, y, w, d };
}

export function shelfInsidePolygon(shelf, polygon) {
  const corners = shelfRotatedCorners(shelf);
  return corners.every((c) => pointInPolygon(c, polygon));
}

export function aisleFootprint(aisle, layout) {
  const aw = Math.max(0.4, Number(aisle.widthMeters) || 1);
  const len =
    aisle.lengthMeters != null
      ? Number(aisle.lengthMeters)
      : Math.max(2, (Number(layout?.widthMeters) || 10) * 0.35);
  const x = Number(aisle.x) || 0;
  const y = Number(aisle.y) || 0;
  // Horizontal aisle runs along X (length=X, width=Y); vertical runs along Y.
  if (aisle.orientation === "vertical") {
    return { x, y, w: aw, d: len };
  }
  return { x, y, w: len, d: aw };
}

/** Rectangular special-zone footprint (meters). */
export function zoneFootprint(zone) {
  return {
    x: Number(zone.x) || 0,
    y: Number(zone.y) || 0,
    w: Math.max(0.1, Number(zone.widthMeters) || 0),
    d: Math.max(0.1, Number(zone.depthMeters) || 0),
  };
}

/** Rectangular obstacle footprint (column / wall / blocked area), meters. */
export function obstacleRect(obstacle) {
  return zoneFootprint(obstacle);
}

export function entityInsideLayout(entity, kind, layout) {
  const poly = layoutBoundaryPolygon(layout);
  if (kind === "entryPoint") {
    return pointInPolygon({ x: Number(entity.x) || 0, y: Number(entity.y) || 0 }, poly);
  }
  if (kind === "shelf") {
    return shelfInsidePolygon(entity, poly);
  }
  const fp =
    kind === "aisle"
      ? aisleFootprint(entity, layout)
      : kind === "zone" || kind === "obstacle"
        ? zoneFootprint(entity)
        : shelfFootprint(entity);
  return rectFullyInsidePolygon(fp.x, fp.y, fp.w, fp.d, poly);
}

export function collectContainmentViolations(layout) {
  const violations = [];
  for (const a of layout.aisles || []) {
    if (!entityInsideLayout(a, "aisle", layout)) {
      violations.push({ kind: "aisle", id: a.id });
    }
  }
  for (const s of layout.shelves || []) {
    if (!entityInsideLayout(s, "shelf", layout)) {
      violations.push({ kind: "shelf", id: s.id });
    }
  }
  return violations;
}

export function assertInsideOrThrow(entity, kind, layout) {
  if (entityInsideLayout(entity, kind, layout)) return;
  console.log(
    JSON.stringify({
      level: "warn",
      message: "containment_violation",
      kind,
      id: entity?.id,
      layoutId: layout?.id,
    })
  );
  const err = new Error("containment_violation");
  err.code = "containment_violation";
  throw err;
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

/** True when a shelf OBB intersects an axis-aligned aisle corridor. */
export function shelfOverlapsAisleRect(shelf, aisleRect) {
  const { w, d } = shelfLocalSize(shelf);
  const sf = shelfFloorFootprint(shelf);
  if (!aabbOverlap(sf, aisleRect)) return false;

  const corners = shelfRotatedCorners(shelf);
  if (corners.some((c) => pointInAabb(c.x, c.y, aisleRect))) return true;

  const aisleCorners = rectCorners(aisleRect.x, aisleRect.y, aisleRect.w, aisleRect.d);
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

export function aisleOverlapsShelf(aisle, shelf, layout) {
  return shelfOverlapsAisleRect(shelf, aisleFootprint(aisle, layout));
}

export function overlapsAnyShelf(aisle, layout, ignoreShelfId) {
  const shelves = layout.shelves?.length ? layout.shelves : layout.fixtures || [];
  for (const s of shelves) {
    if (ignoreShelfId && s.id === ignoreShelfId) continue;
    if (aisleOverlapsShelf(aisle, s, layout)) return s;
  }
  return null;
}

export function overlapsAnyAisle(shelf, layout, ignoreAisleId) {
  for (const a of layout.aisles || []) {
    if (ignoreAisleId && a.id === ignoreAisleId) continue;
    if (aisleOverlapsShelf(a, shelf, layout)) return a;
  }
  return null;
}

/** First obstacle a shelf collides with, or null. Columns are hard blockers. */
export function overlapsAnyObstacle(shelf, layout) {
  for (const o of layout?.obstacles || []) {
    if (shelfOverlapsAisleRect(shelf, obstacleRect(o))) return o;
  }
  return null;
}

/** True when a plain rectangle collides with any obstacle. */
export function rectOverlapsAnyObstacle(rect, layout) {
  for (const o of layout?.obstacles || []) {
    if (aabbOverlap(rect, obstacleRect(o))) return o;
  }
  return null;
}

export function collectOverlapViolations(layout) {
  const violations = [];
  const seen = new Set();
  for (const a of layout.aisles || []) {
    const hit = overlapsAnyShelf(a, layout);
    if (!hit) continue;
    const key = [a.id, hit.id].sort().join(":");
    if (seen.has(key)) continue;
    seen.add(key);
    violations.push({ kind: "aisle", id: a.id, otherKind: "shelf", otherId: hit.id });
  }
  return violations;
}

export function assertNoOverlapOrThrow(entity, kind, layout, { ignoreId } = {}) {
  if (kind === "aisle") {
    const hit = overlapsAnyShelf(entity, layout, ignoreId);
    if (hit) {
      const err = new Error("overlap_violation");
      err.code = "overlap_violation";
      throw err;
    }
    return;
  }
  if (kind === "shelf") {
    const hit = overlapsAnyAisle(entity, layout, ignoreId);
    if (hit) {
      const err = new Error("overlap_violation");
      err.code = "overlap_violation";
      throw err;
    }
    const blocker = overlapsAnyObstacle(entity, layout);
    if (blocker) {
      const err = new Error("obstacle_violation");
      err.code = "obstacle_violation";
      err.obstacleId = blocker.id;
      throw err;
    }
    return;
  }
  if (kind === "obstacle") {
    // A column cannot be dropped onto a fixture that is already standing there.
    const rect = obstacleRect(entity);
    const shelves = layout?.shelves?.length ? layout.shelves : layout?.fixtures || [];
    for (const shelf of shelves) {
      if (shelfOverlapsAisleRect(shelf, rect)) {
        const err = new Error("overlap_violation");
        err.code = "overlap_violation";
        err.shelfId = shelf.id;
        throw err;
      }
    }
  }
}
