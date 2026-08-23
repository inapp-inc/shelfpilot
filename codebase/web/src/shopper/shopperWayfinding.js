/** Route polyline from entry → shelf — graph walk on aisle centerlines only. */

import {
  aisleFootprintMeters,
  layoutStoreEnvelope,
  shelfRotatedCorners,
} from "../layout-editor/polygonCanvas.js";
import { aisleDisplayLabel, shelfCanvasFaceLabel } from "../layout-editor/shelfFaces.js";

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function eqPt(a, b, eps = 0.05) {
  return Math.abs(a.x - b.x) <= eps && Math.abs(a.y - b.y) <= eps;
}

function keyPt(p) {
  return `${p.x.toFixed(2)},${p.y.toFixed(2)}`;
}

function shelfCenter(shelf) {
  const w = Number(shelf.usableWidthMeters ?? shelf.widthMeters) || 1.2;
  const d = Number(shelf.depthMeters) || 0.6;
  const r = (((Number(shelf.rotationDeg) || 0) % 360) + 360) % 360 * (Math.PI / 180);
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  return {
    x: Number(shelf.x) + (w / 2) * cos - (d / 2) * sin,
    y: Number(shelf.y) + (w / 2) * sin + (d / 2) * cos,
  };
}

function walkAisles(layout) {
  return (layout?.aisles || []).filter((a) => a?.id && a.id !== "aisle-check");
}

function centerline(aisle, layout) {
  const fp = aisleFootprintMeters(aisle, layout);
  if (aisle.orientation === "vertical") {
    const x = fp.x + fp.w / 2;
    return { aisle, kind: "vertical", x, y0: fp.y, y1: fp.y + fp.d };
  }
  const y = fp.y + fp.d / 2;
  return { aisle, kind: "horizontal", y, x0: fp.x, x1: fp.x + fp.w };
}

function onCenterline(cl, p) {
  if (cl.kind === "vertical") {
    return Math.abs(p.x - cl.x) <= 0.2 && p.y >= cl.y0 - 0.12 && p.y <= cl.y1 + 0.12;
  }
  return Math.abs(p.y - cl.y) <= 0.2 && p.x >= cl.x0 - 0.12 && p.x <= cl.x1 + 0.12;
}

function projectToCenterline(cl, p) {
  if (cl.kind === "vertical") {
    return { x: cl.x, y: Math.max(cl.y0, Math.min(cl.y1, p.y)) };
  }
  return { x: Math.max(cl.x0, Math.min(cl.x1, p.x)), y: cl.y };
}

function centerlineIntersection(a, b) {
  if (a.kind === b.kind) return null;
  const v = a.kind === "vertical" ? a : b;
  const h = a.kind === "horizontal" ? a : b;
  const x = v.x;
  const y = h.y;
  if (x >= h.x0 - 0.35 && x <= h.x1 + 0.35 && y >= v.y0 - 0.35 && y <= v.y1 + 0.35) {
    return { x, y };
  }
  return null;
}

function pointInPolygon(x, y, poly) {
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

function segmentHitsShelf(x1, y1, x2, y2, shelf, ignoreShelfId) {
  if (!shelf || shelf.id === ignoreShelfId || shelf.pairDisplay) return false;
  const poly = shelfRotatedCorners(shelf);
  const steps = Math.max(4, Math.ceil(dist({ x: x1, y: y1 }, { x: x2, y: y2 }) / 0.1));
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const x = x1 + (x2 - x1) * t;
    const y = y1 + (y2 - y1) * t;
    if (pointInPolygon(x, y, poly)) return true;
  }
  return false;
}

function segmentCrossesShelves(layout, a, b, ignoreShelfId) {
  const shelves = layout?.shelves || [];
  for (const shelf of shelves) {
    if (segmentHitsShelf(a.x, a.y, b.x, b.y, shelf, ignoreShelfId)) return true;
  }
  return false;
}

function pointHitsAnyShelf(layout, p, ignoreShelfId = null) {
  if (!p) return false;
  for (const shelf of layout?.shelves || []) {
    if (!shelf || shelf.id === ignoreShelfId || shelf.pairDisplay) continue;
    if (pointInPolygon(p.x, p.y, shelfRotatedCorners(shelf))) return true;
  }
  return false;
}

function realCenterlines(layout) {
  return walkAisles(layout).map((a) => centerline(a, layout));
}

function resolveTargetAisle(layout, shelf, targetCenter) {
  const aisles = walkAisles(layout);
  const bound = aisles.find((a) => a.id === shelf.aisleId);
  if (bound) return bound;
  return nearestCenterlinePoint(realCenterlines(layout), targetCenter).aisle || null;
}

function pathReaches(path, goal, maxD = 1.6) {
  if (!path?.length || !goal) return false;
  return dist(path[path.length - 1], goal) <= maxD;
}

function simplifyAxisPath(points) {
  if (!points || points.length < 3) return points || [];
  const out = [{ x: points[0].x, y: points[0].y }];
  for (let i = 1; i < points.length - 1; i += 1) {
    const a = out[out.length - 1];
    const b = points[i];
    const c = points[i + 1];
    const colX = Math.abs(a.x - b.x) < 0.04 && Math.abs(b.x - c.x) < 0.04;
    const colY = Math.abs(a.y - b.y) < 0.04 && Math.abs(b.y - c.y) < 0.04;
    if (colX || colY) continue;
    out.push({ x: b.x, y: b.y });
  }
  const last = points[points.length - 1];
  if (!eqPt(out[out.length - 1], last, 0.04)) out.push({ x: last.x, y: last.y });
  return out;
}

/**
 * Axis-aligned walk on empty floor around gondolas. Used when mixed/overlapping
 * aisles leave the centerline graph disconnected (e.g. a far bay like 10D).
 */
function walkGridAroundShelves(layout, start, goal, ignoreShelfId) {
  if (!layout || !start || !goal) return [];
  const envelope = layoutStoreEnvelope(layout);
  const step = 0.45;
  const originX = Number(envelope.x) || 0;
  const originY = Number(envelope.y) || 0;
  const cols = Math.max(3, Math.ceil((Number(envelope.widthMeters) || 10) / step) + 1);
  const rows = Math.max(3, Math.ceil((Number(envelope.depthMeters) || 8) / step) + 1);
  const blocked = new Uint8Array(cols * rows);

  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      const x = originX + c * step;
      const y = originY + r * step;
      if (pointHitsAnyShelf(layout, { x, y }, ignoreShelfId)) blocked[r * cols + c] = 1;
    }
  }

  function idx(c, r) {
    return r * cols + c;
  }
  function cellOf(p) {
    const c = Math.max(0, Math.min(cols - 1, Math.round((p.x - originX) / step)));
    const r = Math.max(0, Math.min(rows - 1, Math.round((p.y - originY) / step)));
    return { c, r };
  }
  function unstick(cell) {
    if (!blocked[idx(cell.c, cell.r)]) return cell;
    for (let rad = 1; rad <= 14; rad += 1) {
      for (let dc = -rad; dc <= rad; dc += 1) {
        for (let dr = -rad; dr <= rad; dr += 1) {
          const nc = cell.c + dc;
          const nr = cell.r + dr;
          if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
          if (!blocked[idx(nc, nr)]) return { c: nc, r: nr };
        }
      }
    }
    return null;
  }

  const s = unstick(cellOf(start));
  const g = unstick(cellOf(goal));
  if (!s || !g) return [];
  const startI = idx(s.c, s.r);
  const goalI = idx(g.c, g.r);
  if (startI === goalI) {
    return eqPt(start, goal) ? [start] : simplifyAxisPath([start, { x: goal.x, y: start.y }, goal]);
  }

  const prev = new Int32Array(cols * rows).fill(-1);
  prev[startI] = -2;
  const queue = [startI];
  let head = 0;
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  while (head < queue.length && prev[goalI] === -1) {
    const cur = queue[head];
    head += 1;
    const c = cur % cols;
    const r = (cur / cols) | 0;
    for (let d = 0; d < dirs.length; d += 1) {
      const nc = c + dirs[d][0];
      const nr = r + dirs[d][1];
      if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
      const ni = idx(nc, nr);
      if (blocked[ni] || prev[ni] !== -1) continue;
      prev[ni] = cur;
      queue.push(ni);
    }
  }
  if (prev[goalI] === -1) return [];

  const cells = [];
  let cur = goalI;
  while (cur >= 0) {
    const c = cur % cols;
    const r = (cur / cols) | 0;
    cells.push({ x: originX + c * step, y: originY + r * step });
    if (prev[cur] === -2) break;
    cur = prev[cur];
  }
  cells.reverse();

  function attach(path, point, atStart) {
    if (!path.length) return [{ x: point.x, y: point.y }];
    const end = atStart ? path[0] : path[path.length - 1];
    if (eqPt(end, point, 0.12)) {
      const copy = path.slice();
      if (atStart) copy[0] = { x: point.x, y: point.y };
      else copy[copy.length - 1] = { x: point.x, y: point.y };
      return copy;
    }
    const midA = { x: point.x, y: end.y };
    const viaA =
      !segmentCrossesShelves(layout, point, midA, ignoreShelfId) &&
      !segmentCrossesShelves(layout, midA, end, ignoreShelfId);
    const elbow = viaA ? midA : { x: end.x, y: point.y };
    if (atStart) return [{ x: point.x, y: point.y }, elbow, ...path];
    return [...path, elbow, { x: point.x, y: point.y }];
  }

  return simplifyAxisPath(attach(attach(cells, start, true), goal, false));
}

function addClearRuns(layout, lines, spec) {
  const a =
    spec.kind === "vertical"
      ? { x: spec.x, y: spec.y0 }
      : { x: spec.x0, y: spec.y };
  const b =
    spec.kind === "vertical"
      ? { x: spec.x, y: spec.y1 }
      : { x: spec.x1, y: spec.y };
  const len = dist(a, b);
  if (len < 0.4) return;
  const steps = Math.max(4, Math.ceil(len / 0.2));
  const pts = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    pts.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  }
  let i = 0;
  while (i < pts.length) {
    while (i < pts.length && pointHitsAnyShelf(layout, pts[i])) i += 1;
    const start = i;
    while (i < pts.length && !pointHitsAnyShelf(layout, pts[i])) i += 1;
    if (i - start < 2) continue;
    const from = pts[start];
    const to = pts[i - 1];
    if (dist(from, to) < 0.35) continue;
    if (spec.kind === "vertical") {
      lines.push({
        aisle: { id: `ring:v:${spec.x.toFixed(2)}:${from.y.toFixed(2)}` },
        kind: "vertical",
        x: spec.x,
        y0: Math.min(from.y, to.y),
        y1: Math.max(from.y, to.y),
        apron: true,
      });
    } else {
      lines.push({
        aisle: { id: `ring:h:${spec.y.toFixed(2)}:${from.x.toFixed(2)}` },
        kind: "horizontal",
        y: spec.y,
        x0: Math.min(from.x, to.x),
        x1: Math.max(from.x, to.x),
        apron: true,
      });
    }
  }
}

function appendPerimeterWalkways(layout, lines) {
  const envelope = layoutStoreEnvelope(layout);
  const inset = 0.4;
  const x0 = envelope.x + inset;
  const y0 = envelope.y + inset;
  const x1 = envelope.x + envelope.widthMeters - inset;
  const y1 = envelope.y + envelope.depthMeters - inset;
  addClearRuns(layout, lines, { kind: "horizontal", y: y0, x0, x1 });
  addClearRuns(layout, lines, { kind: "horizontal", y: y1, x0, x1 });
  addClearRuns(layout, lines, { kind: "vertical", x: x0, y0, y1 });
  addClearRuns(layout, lines, { kind: "vertical", x: x1, y0, y1 });
}

function axisAligned(a, b) {
  return Math.abs(a.x - b.x) < 0.06 || Math.abs(a.y - b.y) < 0.06;
}

/**
 * Parallel grocery aisles rarely intersect. Add short front/back (or left/right) walkways
 * between neighbouring aisles so the shopper can walk the store like a map: along the
 * end of the run, then into the target aisle — never through a gondola.
 */
function appendWalkAprons(layout, lines) {
  const envelope = layoutStoreEnvelope(layout);
  appendPerimeterWalkways(layout, lines);

  function addIfClear(line) {
    const a =
      line.kind === "vertical"
        ? { x: line.x, y: line.y0 }
        : { x: line.x0, y: line.y };
    const b =
      line.kind === "vertical"
        ? { x: line.x, y: line.y1 }
        : { x: line.x1, y: line.y };
    if (dist(a, b) < 0.35) return;
    if (segmentCrossesShelves(layout, a, b, null)) return;
    lines.push(line);
  }

  function linkParallel(group, kind) {
    if (group.length < 2) return;
    const sorted = [...group].sort((a, b) => (kind === "vertical" ? a.x - b.x : a.y - b.y));
    for (let i = 0; i < sorted.length - 1; i += 1) {
      const left = sorted[i];
      const right = sorted[i + 1];
      if (kind === "vertical") {
        const fronts = [left.y0, right.y0];
        const backs = [left.y1, right.y1];
        const tryYs = [
          Math.min(...fronts),
          Math.max(...fronts),
          Math.min(...fronts) - 0.7,
          envelope.y + 0.5,
          Math.max(...backs),
          Math.min(...backs),
          Math.max(...backs) + 0.7,
          envelope.y + envelope.depthMeters - 0.5,
        ];
        for (const y of tryYs) {
          if (!Number.isFinite(y)) continue;
          const yClamped = Math.max(envelope.y + 0.15, Math.min(envelope.y + envelope.depthMeters - 0.15, y));
          const a = { x: left.x, y: yClamped };
          const b = { x: right.x, y: yClamped };
          if (segmentCrossesShelves(layout, a, b, null)) continue;
          addIfClear({
            aisle: { id: `apron:h:${i}:${yClamped.toFixed(2)}` },
            kind: "horizontal",
            y: yClamped,
            x0: Math.min(left.x, right.x),
            x1: Math.max(left.x, right.x),
            apron: true,
          });
          if (Math.abs(left.y0 - yClamped) > 0.2 && Math.abs(left.y1 - yClamped) > 0.2) {
            addIfClear({
              aisle: { id: `apron:stub:${left.aisle.id}:${yClamped.toFixed(2)}` },
              kind: "vertical",
              x: left.x,
              y0: Math.min(left.y0, yClamped),
              y1: Math.max(left.y0, yClamped),
              apron: true,
            });
          }
          if (Math.abs(right.y0 - yClamped) > 0.2 && Math.abs(right.y1 - yClamped) > 0.2) {
            addIfClear({
              aisle: { id: `apron:stub:${right.aisle.id}:${yClamped.toFixed(2)}` },
              kind: "vertical",
              x: right.x,
              y0: Math.min(right.y0, yClamped),
              y1: Math.max(right.y0, yClamped),
              apron: true,
            });
          }
          break;
        }
      } else {
        const tryXs = [
          Math.min(left.x0, right.x0),
          Math.max(left.x0, right.x0),
          envelope.x + 0.5,
          Math.max(left.x1, right.x1),
          envelope.x + envelope.widthMeters - 0.5,
        ];
        for (const x of tryXs) {
          if (!Number.isFinite(x)) continue;
          const xClamped = Math.max(envelope.x + 0.15, Math.min(envelope.x + envelope.widthMeters - 0.15, x));
          const a = { x: xClamped, y: left.y };
          const b = { x: xClamped, y: right.y };
          if (segmentCrossesShelves(layout, a, b, null)) continue;
          addIfClear({
            aisle: { id: `apron:v:${i}:${xClamped.toFixed(2)}` },
            kind: "vertical",
            x: xClamped,
            y0: Math.min(left.y, right.y),
            y1: Math.max(left.y, right.y),
            apron: true,
          });
          break;
        }
      }
    }
  }

  linkParallel(
    lines.filter((l) => l.kind === "vertical" && !l.apron),
    "vertical"
  );
  linkParallel(
    lines.filter((l) => l.kind === "horizontal" && !l.apron),
    "horizontal"
  );
}

/** Build nodes + edges from aisle centerline network plus end-of-aisle walkways. */
function graphFromLines(lines, layout = null) {
  const nodeMap = new Map();

  function addNode(p, aisleId) {
    const k = keyPt(p);
    if (!nodeMap.has(k)) nodeMap.set(k, { ...p, aisleIds: new Set([aisleId]) });
    else nodeMap.get(k).aisleIds.add(aisleId);
  }

  for (const cl of lines) {
    if (cl.kind === "vertical") {
      addNode({ x: cl.x, y: cl.y0 }, cl.aisle.id);
      addNode({ x: cl.x, y: cl.y1 }, cl.aisle.id);
    } else {
      addNode({ x: cl.x0, y: cl.y }, cl.aisle.id);
      addNode({ x: cl.x1, y: cl.y }, cl.aisle.id);
    }
  }

  for (let i = 0; i < lines.length; i += 1) {
    for (let j = i + 1; j < lines.length; j += 1) {
      const hit = centerlineIntersection(lines[i], lines[j]);
      if (hit) {
        addNode(hit, lines[i].aisle.id);
        addNode(hit, lines[j].aisle.id);
      }
    }
  }

  const nodes = [...nodeMap.values()];
  const edges = [];

  for (const cl of lines) {
    const onLine = nodes
      .filter((n) => onCenterline(cl, n))
      .sort((p, q) => (cl.kind === "vertical" ? p.y - q.y : p.x - q.x));
    for (let i = 0; i < onLine.length - 1; i += 1) {
      const a = onLine[i];
      const b = onLine[i + 1];
      if (!axisAligned(a, b)) continue;
      const len = dist(a, b);
      if (len < 0.05) continue;
      if (layout && segmentCrossesShelves(layout, a, b, null)) continue;
      edges.push({ a, b, len, aisleId: cl.aisle.id });
    }
  }

  return { nodes, edges, lines };
}

function buildAisleGraph(layout) {
  const aisles = walkAisles(layout);
  const lines = aisles.map((a) => centerline(a, layout));
  appendWalkAprons(layout, lines);
  return graphFromLines(lines, layout);
}

function nearestCenterlinePoint(lines, p) {
  let best = null;
  let bestD = Infinity;
  let bestAisle = null;
  for (const cl of lines) {
    const q = projectToCenterline(cl, p);
    const d = dist(p, q) + (cl.apron ? 1.6 : 0);
    if (d < bestD) {
      bestD = d;
      best = q;
      bestAisle = cl.aisle;
    }
  }
  return { point: best, aisle: bestAisle, dist: bestD };
}

function shelfFacingEdge(corners, aislePoint) {
  const center = {
    x: corners.reduce((s, c) => s + c.x, 0) / corners.length,
    y: corners.reduce((s, c) => s + c.y, 0) / corners.length,
  };
  let best = null;
  let bestDist = Infinity;

  for (let i = 0; i < corners.length; i += 1) {
    const a = corners[i];
    const b = corners[(i + 1) % corners.length];
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const toAisle = { x: aislePoint.x - mid.x, y: aislePoint.y - mid.y };
    const toCenter = { x: center.x - mid.x, y: center.y - mid.y };
    if (toAisle.x * toCenter.x + toAisle.y * toCenter.y > 0.02) continue;
    const d = Math.hypot(toAisle.x, toAisle.y);
    const edgeLen = Math.hypot(b.x - a.x, b.y - a.y);
    if (d < bestDist || (Math.abs(d - bestDist) < 0.05 && edgeLen > (best?.edgeLen || 0))) {
      bestDist = d;
      best = { a, b, mid, edgeLen };
    }
  }

  if (!best) {
    return { edgeMid: center, left: corners[0], right: corners[1] };
  }

  const edgeVec = { x: best.b.x - best.a.x, y: best.b.y - best.a.y };
  const elen = Math.hypot(edgeVec.x, edgeVec.y) || 1;
  const along = { x: edgeVec.x / elen, y: edgeVec.y / elen };
  const toShelf = { x: best.mid.x - aislePoint.x, y: best.mid.y - aislePoint.y };
  const cross = along.x * toShelf.y - along.y * toShelf.x;
  const left = cross > 0 ? best.a : best.b;
  const right = cross > 0 ? best.b : best.a;
  return { edgeMid: best.mid, left, right };
}

/** Customer stop point — left end of the aisle-facing shelf edge, slightly toward the aisle. */
export function shelfApproachPoint(shelf, layout, aisleNearPoint = null) {
  if (!shelf) return null;
  const corners = shelfRotatedCorners(shelf);
  const center = shelfCenter(shelf);
  const { lines } = buildAisleGraph(layout || { aisles: [] });
  const near =
    aisleNearPoint ||
    nearestCenterlinePoint(lines, center).point ||
    center;
  const edge = shelfFacingEdge(corners, near);
  const pull = 0.14;
  const approach = {
    x: edge.left.x + (edge.edgeMid.x - edge.left.x) * 0.18 + (near.x - edge.edgeMid.x) * pull,
    y: edge.left.y + (edge.edgeMid.y - edge.left.y) * 0.18 + (near.y - edge.edgeMid.y) * pull,
  };
  const marker = {
    x: edge.left.x + (edge.edgeMid.x - edge.left.x) * 0.12,
    y: edge.left.y + (edge.edgeMid.y - edge.left.y) * 0.12,
  };
  return { approach, marker, edgeMid: edge.edgeMid, edgeLeft: edge.left, edgeRight: edge.right };
}

/** Split route into aisle walk path and final step onto the shelf front. */
export function splitShopperRoute(route, markerPoint = null) {
  if (!route?.length) return { aislePath: [], connector: [], destination: null, marker: null };
  if (route.length === 1) {
    const m = markerPoint || route[0];
    return { aislePath: [], connector: [], destination: route[0], marker: m };
  }
  const destination = route[route.length - 1];
  return {
    aislePath: route.slice(0, -1),
    connector: [route[route.length - 2], destination],
    destination,
    marker: markerPoint || destination,
  };
}

function cardinalHint(from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? "east" : "west";
  return dy >= 0 ? "south" : "north";
}

/**
 * Front-of-store entrance plaza when the layout has no entry point.
 * Door sits on the min-Y (front) edge, centered, inset so shoppers start in a clear space.
 */
function snapToFrontAisleEnd(layout, prefer) {
  const aisles = walkAisles(layout);
  if (!aisles.length) return prefer;
  let best = null;
  let bestScore = Infinity;
  for (const aisle of aisles) {
    const cl = centerline(aisle, layout);
    const ends =
      cl.kind === "vertical"
        ? [
            { x: cl.x, y: cl.y0 },
            { x: cl.x, y: cl.y1 },
          ]
        : [
            { x: cl.x0, y: cl.y },
            { x: cl.x1, y: cl.y },
          ];
    for (const p of ends) {
      const score = p.y * 6 + dist(p, prefer) * 0.35;
      if (score < bestScore) {
        bestScore = score;
        best = p;
      }
    }
  }
  return best || prefer;
}

export function assumeEntranceSpace(layout) {
  const envelope = layoutStoreEnvelope(layout);
  const minX = Number(envelope.x) || 0;
  const minY = Number(envelope.y) || 0;
  const storeW = Number(envelope.widthMeters) || 10;
  const storeD = Number(envelope.depthMeters) || 8;
  const w = Math.max(1.4, Math.min(2.4, storeW * 0.12));
  const d = Math.max(1.1, Math.min(1.6, storeD * 0.1));
  const prefer = { x: minX + storeW / 2, y: minY + d * 0.4 };
  const snap = snapToFrontAisleEnd(layout, prefer);
  return {
    id: "entry-assumed",
    label: "Entrance",
    assumed: true,
    x: snap.x,
    y: snap.y,
    plaza: { x: snap.x - w / 2, y: snap.y - d * 0.35, w, d },
  };
}

/** Configured entry, first layout entry, or an assumed front-of-store space. */
export function resolveShopperEntry(layout, configured = null) {
  const usable = (p) =>
    p && Number.isFinite(Number(p.x)) && Number.isFinite(Number(p.y));
  if (usable(configured)) {
    return {
      id: configured.id || "entry-configured",
      label: configured.name || configured.label || "Entrance",
      assumed: false,
      x: Number(configured.x),
      y: Number(configured.y),
      plaza: configured.plaza || null,
    };
  }
  const fromLayout = (layout?.entryPoints || []).find(usable);
  if (fromLayout) {
    return {
      id: fromLayout.id || "entry-layout",
      label: fromLayout.name || fromLayout.label || "Entrance",
      assumed: false,
      x: Number(fromLayout.x),
      y: Number(fromLayout.y),
      plaza: null,
    };
  }
  return assumeEntranceSpace(layout);
}

function pushUnique(out, p, eps = 0.04) {
  if (!p) return;
  const prev = out[out.length - 1];
  if (!prev || !eqPt(prev, p, eps)) out.push({ x: p.x, y: p.y });
}

/** Short axis-aligned link from entrance plaza onto the nearest aisle (no shelf cut-through). */
function entranceConnector(start, entrySnap, layout, ignoreShelfId) {
  if (!entrySnap?.point || eqPt(start, entrySnap.point, 0.12)) return [];
  const midA = { x: entrySnap.point.x, y: start.y };
  const midB = { x: start.x, y: entrySnap.point.y };
  const viaA =
    axisAligned(start, midA) &&
    axisAligned(midA, entrySnap.point) &&
    !segmentCrossesShelves(layout, start, midA, ignoreShelfId) &&
    !segmentCrossesShelves(layout, midA, entrySnap.point, ignoreShelfId);
  if (viaA) return [start, midA];
  const viaB =
    axisAligned(start, midB) &&
    axisAligned(midB, entrySnap.point) &&
    !segmentCrossesShelves(layout, start, midB, ignoreShelfId) &&
    !segmentCrossesShelves(layout, midB, entrySnap.point, ignoreShelfId);
  if (viaB) return [start, midB];
  return [start];
}

function projectOnSegment(p, a, b) {
  const vx = b.x - a.x;
  const vy = b.y - a.y;
  const len2 = vx * vx + vy * vy || 1;
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * vx + (p.y - a.y) * vy) / len2));
  return { x: a.x + vx * t, y: a.y + vy * t };
}

function injectPointOnGraph(graph, p, layout = null) {
  const k = keyPt(p);
  if (graph.nodes.some((n) => keyPt(n) === k)) return k;

  let host = null;
  let hostD = 0.45;
  for (const e of graph.edges) {
    const q = projectOnSegment(p, e.a, e.b);
    const d = dist(p, q);
    if (d < hostD) {
      host = e;
      hostD = d;
    }
  }

  graph.nodes.push({ x: p.x, y: p.y, aisleIds: new Set() });
  if (host) {
    graph.edges = graph.edges.filter((e) => e !== host);
    const pa = dist(host.a, p);
    const pb = dist(p, host.b);
    if (pa > 0.04) graph.edges.push({ a: host.a, b: p, len: pa, aisleId: host.aisleId });
    if (pb > 0.04) graph.edges.push({ a: p, b: host.b, len: pb, aisleId: host.aisleId });
  } else {
    let nearest = graph.nodes[0];
    let best = Infinity;
    for (const n of graph.nodes) {
      if (n === p || (n.x === p.x && n.y === p.y)) continue;
      const d = dist(n, p);
      if (d < best) {
        best = d;
        nearest = n;
      }
    }
    if (nearest && Number.isFinite(best) && best < 4) {
      const midA = { x: nearest.x, y: p.y };
      const midB = { x: p.x, y: nearest.y };
      const viaA =
        !layout ||
        (!segmentCrossesShelves(layout, p, midA, null) &&
          !segmentCrossesShelves(layout, midA, nearest, null));
      const viaB =
        !layout ||
        (!segmentCrossesShelves(layout, p, midB, null) &&
          !segmentCrossesShelves(layout, midB, nearest, null));
      if (viaA || viaB || !layout) {
        const elbow = viaA ? midA : midB;
        if (!eqPt(p, elbow, 0.04)) {
          graph.nodes.push({ x: elbow.x, y: elbow.y, aisleIds: new Set() });
          graph.edges.push({ a: p, b: elbow, len: dist(p, elbow), aisleId: "snap" });
          graph.edges.push({ a: elbow, b: nearest, len: dist(elbow, nearest), aisleId: "snap" });
        } else {
          graph.edges.push({ a: p, b: nearest, len: best, aisleId: "snap" });
        }
      }
    }
  }
  return k;
}

function dijkstraPolyline(graph, startKey, goalKey) {
  const adj = new Map();
  for (const e of graph.edges) {
    const ka = keyPt(e.a);
    const kb = keyPt(e.b);
    if (!adj.has(ka)) adj.set(ka, []);
    if (!adj.has(kb)) adj.set(kb, []);
    adj.get(ka).push({ key: kb, point: e.b, len: e.len });
    adj.get(kb).push({ key: ka, point: e.a, len: e.len });
  }

  const distMap = new Map([[startKey, 0]]);
  const prev = new Map();
  const seen = new Set();
  while (seen.size < distMap.size || !seen.has(goalKey)) {
    let cur = null;
    let curD = Infinity;
    for (const [k, d] of distMap) {
      if (seen.has(k)) continue;
      if (d < curD) {
        curD = d;
        cur = k;
      }
    }
    if (cur == null) break;
    seen.add(cur);
    if (cur === goalKey) break;
    for (const n of adj.get(cur) || []) {
      const nd = curD + n.len;
      if (nd < (distMap.get(n.key) ?? Infinity)) {
        distMap.set(n.key, nd);
        prev.set(n.key, { key: cur, point: n.point });
      }
    }
  }

  if (!distMap.has(goalKey)) return [];
  const pointByKey = new Map();
  for (const n of graph.nodes) pointByKey.set(keyPt(n), n);
  const out = [];
  let cur = goalKey;
  while (cur) {
    const p = pointByKey.get(cur);
    if (p) out.unshift({ x: p.x, y: p.y });
    const step = prev.get(cur);
    cur = step?.key || null;
  }
  return out;
}

/** Walk only aisle centerlines and end-of-run walkways. Never shortcuts through a shelf. */
export function walkAisleNetwork(start, goal, lines, layout = null) {
  if (!start || !goal || !lines?.length) return [];
  const network = layout ? buildAisleGraph(layout) : graphFromLines(lines, null);
  const from = nearestCenterlinePoint(network.lines, start);
  const to = nearestCenterlinePoint(network.lines, goal);
  if (!from.point || !to.point) return [];
  if (eqPt(from.point, to.point, 0.08)) return [from.point];
  const live = { nodes: [...network.nodes], edges: [...network.edges], lines: network.lines };
  const startKey = injectPointOnGraph(live, from.point, layout);
  const goalKey = injectPointOnGraph(live, to.point, layout);
  return dijkstraPolyline(live, startKey, goalKey);
}

/** Re-bind any polyline onto the aisle-centerline network. */
export function bindRouteToAisles(points, lines) {
  if (!points?.length || !lines?.length) return points || [];
  return walkAisleNetwork(points[0], points[points.length - 1], lines);
}

/** Customer-facing point on the shelf footprint — route arrow and marker land here. */
export function shelfRouteDestination(shelf, layout, aisleNearPoint = null) {
  if (!shelf) return null;
  const edge = shelfApproachPoint(shelf, layout, aisleNearPoint);
  if (edge?.marker) return { x: edge.marker.x, y: edge.marker.y };
  if (edge?.edgeMid) return { x: edge.edgeMid.x, y: edge.edgeMid.y };
  return shelfCenter(shelf);
}

function pickAxisConnector(from, to, layout, ignoreShelfId) {
  if (eqPt(from, to, 0.05)) return [];
  const axisDirect =
    Math.abs(from.x - to.x) < 0.06 || Math.abs(from.y - to.y) < 0.06 ? [to] : [];
  const opts = [
    ...axisDirect.map((leg) => [leg]),
    [{ x: to.x, y: from.y }, to],
    [{ x: from.x, y: to.y }, to],
  ];
  let best = null;
  let bestLen = Infinity;
  for (const legs of opts) {
    let prev = from;
    let len = 0;
    let blocked = false;
    for (const leg of legs) {
      if (segmentCrossesShelves(layout, prev, leg, ignoreShelfId)) {
        blocked = true;
        break;
      }
      len += dist(prev, leg);
      prev = leg;
    }
    if (!blocked && len < bestLen) {
      bestLen = len;
      best = legs;
    }
  }
  return best || [];
}

/** Drop any tail segment that would cut through fixtures (target shelf may be ignored). */
export function sanitizeRoutePolyline(layout, route, ignoreShelfId = null) {
  if (!route?.length) return [];
  const out = [{ x: route[0].x, y: route[0].y }];
  for (let i = 1; i < route.length; i += 1) {
    const prev = out[out.length - 1];
    const next = route[i];
    if (segmentCrossesShelves(layout, prev, next, ignoreShelfId)) break;
    if (!eqPt(prev, next, 0.04)) out.push({ x: next.x, y: next.y });
  }
  return out;
}

function routeSegmentsClear(layout, route, ignoreShelfId = null) {
  if (!route || route.length < 2) return false;
  for (let i = 1; i < route.length; i += 1) {
    if (segmentCrossesShelves(layout, route[i - 1], route[i], ignoreShelfId)) return false;
  }
  return true;
}

/** Walking line for map overlay — aisle network only, never through fixtures. */
export function routePolylineForMap(layout, route, shelfId = null) {
  if (!route?.length) return [];
  return sanitizeRoutePolyline(layout, route, shelfId);
}

/** Final leg from the aisle walk onto the highlighted shelf (axis-aligned, no shelf cuts). */
export function appendRouteToShelf(layout, route, shelfId) {
  if (!route?.length || !layout || !shelfId) return route || [];
  const shelf =
    (layout.shelves || []).find((s) => s.id === shelfId && !s.pairDisplay) ||
    (layout.shelves || []).find((s) => s.id === shelfId);
  if (!shelf) return route;

  const last = route[route.length - 1];
  const near = route.length >= 2 ? route[route.length - 2] : last;
  const dest = shelfRouteDestination(shelf, layout, near);
  if (!dest || eqPt(last, dest, 0.12)) return route;

  const legs = pickAxisConnector(last, dest, layout, shelfId);
  if (!legs.length) return route;

  const out = [...route];
  for (const leg of legs) {
    if (!eqPt(out[out.length - 1], leg, 0.06)) out.push(leg);
  }
  return out;
}

function finishShopperRoute(layout, route, shelfId) {
  if (!route?.length) return route || [];
  const withShelf = appendRouteToShelf(layout, route, shelfId);
  return sanitizeRoutePolyline(layout, withShelf, shelfId);
}

/** @returns {{ x: number, y: number }[]} */
export function computeShopperRoute(layout, entryPoint, shelfId) {
  if (!shelfId || !layout) return [];
  const shelf = (layout.shelves || []).find((s) => s.id === shelfId);
  if (!shelf) return [];

  const aisles = walkAisles(layout);
  const entry = resolveShopperEntry(layout, entryPoint);
  const start = { x: Number(entry.x), y: Number(entry.y) };
  const targetCenter = shelfCenter(shelf);

  if (!aisles.length) {
    const gridPath = walkGridAroundShelves(layout, start, targetCenter, shelfId);
    return finishShopperRoute(
      layout,
      gridPath.length >= 2 ? gridPath : [start],
      shelfId
    );
  }

  const { lines } = buildAisleGraph(layout);
  const targetAisle = resolveTargetAisle(layout, shelf, targetCenter);
  if (!targetAisle) {
    const gridPath = walkGridAroundShelves(layout, start, targetCenter, shelfId);
    return finishShopperRoute(
      layout,
      gridPath.length >= 2 ? gridPath : [start],
      shelfId
    );
  }

  const onTarget = projectToCenterline(centerline(targetAisle, layout), targetCenter);
  const entrySnap = nearestCenterlinePoint(lines, start);
  if (!entrySnap.point) {
    const gridPath = walkGridAroundShelves(layout, start, onTarget, shelfId);
    return finishShopperRoute(
      layout,
      gridPath.length >= 2 ? gridPath : [start],
      shelfId
    );
  }

  const aislePath = walkAisleNetwork(entrySnap.point, onTarget, lines, layout);
  const out = [];
  for (const p of entranceConnector(start, entrySnap, layout, shelfId)) pushUnique(out, p);
  if (!out.length || !eqPt(out[out.length - 1], entrySnap.point, 0.1)) {
    pushUnique(out, entrySnap.point);
  }
  for (const p of aislePath) {
    if (eqPt(out[out.length - 1], p, 0.06)) continue;
    pushUnique(out, p);
  }

  if (out.length >= 2 && pathReaches(out, onTarget, 1.6)) {
    return finishShopperRoute(layout, out, shelfId);
  }

  const gridPath = walkGridAroundShelves(layout, start, onTarget, shelfId);
  if (routeSegmentsClear(layout, gridPath, shelfId)) {
    return finishShopperRoute(layout, gridPath, shelfId);
  }
  return finishShopperRoute(layout, out.length ? out : [start], shelfId);
}

/** Exact shelf footprint plus a badge on the customer-facing shelf edge. */
export function shelfMarkerFootprint(layout, shelfId, aisleNearPoint = null) {
  if (!layout || !shelfId) return null;
  const shelf =
    (layout.shelves || []).find((s) => s.id === shelfId && !s.pairDisplay) ||
    (layout.shelves || []).find((s) => s.id === shelfId);
  if (!shelf) return null;

  const corners = shelfRotatedCorners(shelf);
  const center = shelfCenter(shelf);
  const edge = shelfApproachPoint(shelf, layout, aisleNearPoint);
  const badge = shelfRouteDestination(shelf, layout, aisleNearPoint) || center;

  return { corners, badge, center, facingEdge: edge?.edgeMid || null };
}

/** Small badge on the real shelf — not the store centroid or a large pin tip. */
export function shelfMarkerPoint(layout, shelfId, fromPoint = null) {
  return shelfMarkerFootprint(layout, shelfId, fromPoint)?.badge || null;
}

export function routeLengthMeters(path) {
  let total = 0;
  for (let i = 1; i < path.length; i += 1) {
    total += dist(path[i - 1], path[i]);
  }
  return total;
}

export function buildAisleWalkSteps(layout, route, entryPoint, shelfId) {
  if (!layout || !shelfId || route.length < 2) return [];

  const shelf = (layout.shelves || []).find((s) => s.id === shelfId);
  if (!shelf) return [];

  const entry = resolveShopperEntry(layout, entryPoint);
  const aisles = walkAisles(layout);
  const allShelves = layout.shelves || [];
  const targetAisle = aisles.find((a) => a.id === shelf.aisleId);
  const shelfLbl = shelfCanvasFaceLabel(shelf, "A", aisles, allShelves);
  const meters = Math.max(1, Math.round(routeLengthMeters(route)));
  const heading = cardinalHint(route[0], route[1] || route[0]);
  const steps = [];

  steps.push({
    kind: "start",
    text: `Start at the ${entry.label || "Entrance"}`,
  });
  steps.push({
    kind: "walk",
    text: `Follow the blue line ${heading} for about ${meters} meters`,
  });

  if (targetAisle) {
    const aisleName = aisleDisplayLabel(targetAisle);
    steps.push({
      kind: "aisle",
      text: `Walk into aisle ${aisleName}`,
    });
    steps.push({
      kind: "shelf",
      text: `Stop at shelf ${shelfLbl}`,
    });
  } else {
    steps.push({
      kind: "shelf",
      text: `Stop at shelf ${shelfLbl}`,
    });
  }

  steps.push({
    kind: "arrive",
    text: "Your product is marked on the highlighted shelf",
  });

  return steps;
}

export { shelfCenter, buildAisleGraph, segmentCrossesShelves };
