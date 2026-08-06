/**
 * Spatial binding: link gondola shelf records to nearest walk aisles on each face side.
 */
import { aisleFootprint, layoutBoundaryPolygon, shelfFloorFootprint } from "./polygonContainment.js";

function rotRad(shelf) {
  return (((Number(shelf.rotationDeg) || 0) % 360) + 360) % 360 * (Math.PI / 180);
}

/** Max distance (m) to bind a shelf face to a walk aisle — scales with floor size. */
export function maxBindDistanceMeters(layout) {
  const poly = layoutBoundaryPolygon(layout);
  const xs = poly.map((p) => p.x);
  const ys = poly.map((p) => p.y);
  const bw = Math.max(0.1, Math.max(...xs) - Math.min(...xs));
  const bd = Math.max(0.1, Math.max(...ys) - Math.min(...ys));
  return Math.max(5, Math.hypot(bw, bd) * 0.32);
}

/** Shelf center in layout coordinates (meters). */
export function shelfCenter(shelf) {
  const w = Number(shelf.usableWidthMeters ?? shelf.widthMeters) || 1.2;
  const d = Number(shelf.depthMeters) || 0.6;
  const r = rotRad(shelf);
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  const cx = shelf.x + (w / 2) * cos - (d / 2) * sin;
  const cy = shelf.y + (w / 2) * sin + (d / 2) * cos;
  return { x: cx, y: cy };
}

/** Unit vector pointing toward the customer-facing edge (Face A / front). */
export function shelfFrontNormal(shelf) {
  const r = rotRad(shelf);
  return { x: -Math.sin(r), y: -Math.cos(r) };
}

function aisleCenter(aisle, layout) {
  const fp = aisleFootprint(aisle, layout);
  return { x: fp.x + fp.w / 2, y: fp.y + fp.d / 2 };
}

function bindFromPoint(point, normal, aisles, layout, directionSign, shelf = null) {
  const nx = normal.x * directionSign;
  const ny = normal.y * directionSign;
  const maxAlong = maxBindDistanceMeters(layout);
  const shelfFp = shelf ? shelfFloorFootprint(shelf) : null;
  const facesVertical = Math.abs(nx) > Math.abs(ny) * 1.08;
  const facesHorizontal = Math.abs(ny) > Math.abs(nx) * 1.08;
  let best = null;
  let bestScore = Infinity;

  for (const aisle of aisles || []) {
    if (!aisle?.id || aisle.id === "aisle-check") continue;
    const fp = aisleFootprint(aisle, layout);
    const ac = { x: fp.x + fp.w / 2, y: fp.y + fp.d / 2 };
    const dx = ac.x - point.x;
    const dy = ac.y - point.y;
    const along = dx * nx + dy * ny;
    if (along < 0.05) continue;

    const aisleIsVertical = aisle.orientation === "vertical";
    if (facesVertical && !aisleIsVertical) continue;
    if (facesHorizontal && aisleIsVertical) continue;

    if (aisleIsVertical) {
      const y0 = shelfFp ? shelfFp.y : point.y - 0.45;
      const y1 = shelfFp ? shelfFp.y + shelfFp.d : point.y + 0.45;
      const overlap = Math.min(fp.y + fp.d, y1) - Math.max(fp.y, y0);
      if (overlap < 0.25) continue;
    } else {
      const x0 = shelfFp ? shelfFp.x : point.x - 0.45;
      const x1 = shelfFp ? shelfFp.x + shelfFp.w : point.x + 0.45;
      const overlap = Math.min(fp.x + fp.w, x1) - Math.max(fp.x, x0);
      if (overlap < 0.25) continue;
    }

    const perp = Math.abs(dx * -ny + dy * nx);
    const score = along + perp * 1.6;
    if (score < bestScore && along < maxAlong) {
      bestScore = score;
      best = aisle;
    }
  }
  return best?.id || null;
}

/**
 * Assign aisleId on front/back shelves of each pair (and single shelves → front aisle).
 */
export function bindShelvesToAisles(shelves, aisles, layout) {
  if (!shelves?.length || !aisles?.length) return shelves;

  const byPair = new Map();
  for (const s of shelves) {
    if (!s.pairId) continue;
    if (!byPair.has(s.pairId)) byPair.set(s.pairId, {});
    byPair.get(s.pairId)[s.pairRole === "back" ? "back" : "front"] = s;
  }

  const boundPairs = new Set();
  for (const s of shelves) {
    if (s.pairId && byPair.has(s.pairId) && !boundPairs.has(s.pairId)) {
      boundPairs.add(s.pairId);
      const pair = byPair.get(s.pairId);
      if (!pair.front) continue;
      const center = shelfCenter(pair.front);
      const normal = shelfFrontNormal(pair.front);
      pair.front.aisleId = bindFromPoint(center, normal, aisles, layout, 1, pair.front);
      if (pair.back) {
        const backCenter = shelfCenter(pair.back);
        pair.back.aisleId = bindFromPoint(backCenter, normal, aisles, layout, -1, pair.back);
      }
      continue;
    }
    if (!s.pairId) {
      const center = shelfCenter(s);
      const normal = shelfFrontNormal(s);
      s.aisleId = bindFromPoint(center, normal, aisles, layout, 1, s);
    }
  }
  return shelves;
}

/**
 * Drop auto-generated walk aisles that no shelf references after binding.
 * Hand-drawn aisles survive: a designer may lay corridors out before any fixture
 * exists, and silently deleting that work is worse than an unused corridor.
 */
export function pruneOrphanAisles(shelves, aisles) {
  const used = new Set();
  for (const s of shelves || []) {
    if (s.aisleId) used.add(s.aisleId);
  }
  return (aisles || []).filter((a) => a?.id && (a.source === "manual" || used.has(a.id)));
}

/** Bind shelves to aisles, remove orphan corridors, re-bind if needed. */
export function finalizeAisleShelfBinding(shelves, aisles, layout) {
  if (!shelves?.length) return { shelves, aisles: aisles || [] };
  let workingAisles = [...(aisles || [])];
  bindShelvesToAisles(shelves, workingAisles, layout);
  workingAisles = pruneOrphanAisles(shelves, workingAisles);
  const validIds = new Set(workingAisles.map((a) => a.id));
  for (const s of shelves) {
    if (s.aisleId && !validIds.has(s.aisleId)) s.aisleId = null;
  }
  bindShelvesToAisles(shelves, workingAisles, layout);
  workingAisles = pruneOrphanAisles(shelves, workingAisles);
  return { shelves, aisles: workingAisles };
}
