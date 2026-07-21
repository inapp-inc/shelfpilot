/**
 * Polygon containment for layout aisles/shelves (strict).
 */

const MAX_VERTICES = 64;

export function layoutBoundaryPolygon(layout) {
  if (layout?.shape === "polygon" && Array.isArray(layout.polygon) && layout.polygon.length >= 3) {
    return layout.polygon.map((p) => ({ x: Number(p.x), y: Number(p.y) }));
  }
  const w = Number(layout?.widthMeters) || 0;
  const d = Number(layout?.depthMeters) || 0;
  return [
    { x: 0, y: 0 },
    { x: w, y: 0 },
    { x: w, y: d },
    { x: 0, y: d },
  ];
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

/** Floor-plan footprint in meters (accounts for 90° rotation). */
export function shelfFloorFootprint(shelf) {
  const x = Number(shelf.x) || 0;
  const y = Number(shelf.y) || 0;
  const rot = ((Number(shelf.rotationDeg) || 0) % 360 + 360) % 360;
  const usable = Number(shelf.usableWidthMeters ?? shelf.widthMeters) || 0;
  const depth = Number(shelf.depthMeters) || 0;
  const widthM = Number(shelf.widthMeters) || usable;
  if (rot === 90 || rot === 270) {
    return { x, y, w: widthM, d: depth || usable };
  }
  return { x, y, w: usable || widthM, d: depth };
}

export function shelfFootprint(shelf) {
  const { x, y, w, d } = shelfFloorFootprint(shelf);
  return { x, y, w, d };
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

export function entityInsideLayout(entity, kind, layout) {
  const poly = layoutBoundaryPolygon(layout);
  if (kind === "entryPoint") {
    return pointInPolygon({ x: Number(entity.x) || 0, y: Number(entity.y) || 0 }, poly);
  }
  const fp =
    kind === "aisle"
      ? aisleFootprint(entity, layout)
      : kind === "zone"
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
