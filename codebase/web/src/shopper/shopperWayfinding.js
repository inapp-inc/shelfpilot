/** Route polyline from entry → shelf — graph walk on aisle centerlines only. */

import { aisleFootprintMeters, shelfRotatedCorners } from "../layout-editor/polygonCanvas.js";
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
    return Math.abs(p.x - cl.x) <= 0.08 && p.y >= cl.y0 - 0.05 && p.y <= cl.y1 + 0.05;
  }
  return Math.abs(p.y - cl.y) <= 0.08 && p.x >= cl.x0 - 0.05 && p.x <= cl.x1 + 0.05;
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
  if (x >= h.x0 - 0.05 && x <= h.x1 + 0.05 && y >= v.y0 - 0.05 && y <= v.y1 + 0.05) {
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
  const steps = Math.max(2, Math.ceil(dist({ x: x1, y: y1 }, { x: x2, y: y2 }) / 0.25));
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

function axisAligned(a, b) {
  return Math.abs(a.x - b.x) < 0.06 || Math.abs(a.y - b.y) < 0.06;
}

/** Build nodes + edges from aisle centerline network. */
function buildAisleGraph(layout) {
  const aisles = walkAisles(layout);
  const lines = aisles.map((a) => centerline(a, layout));
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
      edges.push({ a, b, len, aisleId: cl.aisle.id });
    }
  }

  return { nodes, edges, lines };
}

function nearestNode(nodes, p) {
  let best = null;
  let bestD = Infinity;
  for (const n of nodes) {
    const d = dist(n, p);
    if (d < bestD) {
      bestD = d;
      best = n;
    }
  }
  return best;
}

function linkPointOnCenterline(cl, point, nodes, edges, layout, ignoreShelfId) {
  const k = keyPt(point);
  if (!nodes.some((n) => keyPt(n) === k)) {
    nodes.push({ ...point, aisleIds: new Set([cl.aisle.id]) });
  }
  const onLine = nodes
    .filter((n) => onCenterline(cl, n))
    .sort((p, q) => (cl.kind === "vertical" ? p.y - q.y : p.x - q.x));
  const idx = onLine.findIndex((n) => keyPt(n) === k);
  if (idx < 0) return;
  const prev = onLine[idx - 1];
  const next = onLine[idx + 1];
  if (prev && axisAligned(prev, point) && !segmentCrossesShelves(layout, prev, point, ignoreShelfId)) {
    edges.push({ a: prev, b: point, len: dist(prev, point), aisleId: cl.aisle.id });
  }
  if (next && axisAligned(point, next) && !segmentCrossesShelves(layout, point, next, ignoreShelfId)) {
    edges.push({ a: point, b: next, len: dist(point, next), aisleId: cl.aisle.id });
  }
}

function bfsPath(nodes, edges, start, goal, layout, ignoreShelfId) {
  const startK = keyPt(start);
  const goalK = keyPt(goal);
  const adj = new Map();
  for (const e of edges) {
    if (segmentCrossesShelves(layout, e.a, e.b, ignoreShelfId)) continue;
    const ka = keyPt(e.a);
    const kb = keyPt(e.b);
    if (!adj.has(ka)) adj.set(ka, []);
    if (!adj.has(kb)) adj.set(kb, []);
    adj.get(ka).push({ to: kb, point: e.b, len: e.len });
    adj.get(kb).push({ to: ka, point: e.a, len: e.len });
  }

  const queue = [{ k: startK, cost: 0 }];
  const prev = new Map();
  prev.set(startK, null);
  const cost = new Map([[startK, 0]]);

  while (queue.length) {
    queue.sort((a, b) => a.cost - b.cost);
    const { k } = queue.shift();
    if (k === goalK) break;
    for (const step of adj.get(k) || []) {
      const nc = cost.get(k) + step.len;
      if (cost.has(step.to) && cost.get(step.to) <= nc) continue;
      cost.set(step.to, nc);
      prev.set(step.to, k);
      queue.push({ k: step.to, cost: nc });
    }
  }

  if (!prev.has(goalK)) return null;

  const path = [];
  let cur = goalK;
  while (cur) {
    const [xs, ys] = cur.split(",");
    path.unshift({ x: Number(xs), y: Number(ys) });
    cur = prev.get(cur) ?? null;
  }
  return path;
}

function nearestCenterlinePoint(lines, p) {
  let best = null;
  let bestD = Infinity;
  let bestAisle = null;
  for (const cl of lines) {
    const q = projectToCenterline(cl, p);
    const d = dist(p, q);
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

function pushIfFar(list, point, minM = 0.25) {
  const prev = list[list.length - 1];
  if (!prev || dist(prev, point) >= minM) list.push({ x: point.x, y: point.y });
}

function cardinalHint(from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? "east" : "west";
  return dy >= 0 ? "south" : "north";
}

/** @returns {{ x: number, y: number }[]} */
export function computeShopperRoute(layout, entryPoint, shelfId) {
  if (!entryPoint || !shelfId || !layout) return [];
  const shelf = (layout.shelves || []).find((s) => s.id === shelfId);
  if (!shelf) return [];

  const aisles = walkAisles(layout);
  if (!aisles.length) return [];

  const start = { x: Number(entryPoint.x), y: Number(entryPoint.y) };
  const targetCenter = shelfCenter(shelf);
  const { nodes, edges, lines } = buildAisleGraph(layout);

  const targetAisle =
    aisles.find((a) => a.id === shelf.aisleId) ||
    nearestCenterlinePoint(lines, targetCenter).aisle;
  if (!targetAisle) return [];

  const targetCl = centerline(targetAisle, layout);
  const onTarget = projectToCenterline(targetCl, targetCenter);

  const entrySnap = nearestCenterlinePoint(lines, start);
  if (!entrySnap.point) return [];

  const onEntry = entrySnap.point;
  const graphNodes = [...nodes];
  const graphEdges = [...edges];
  linkPointOnCenterline(centerline(entrySnap.aisle, layout), onEntry, graphNodes, graphEdges, layout, shelfId);
  linkPointOnCenterline(targetCl, onTarget, graphNodes, graphEdges, layout, shelfId);

  let graphPath = bfsPath(graphNodes, graphEdges, onEntry, onTarget, layout, shelfId);

  if (!graphPath || graphPath.length < 2) {
    if (entrySnap.aisle?.id === targetAisle.id && !segmentCrossesShelves(layout, onEntry, onTarget, shelfId)) {
      graphPath = [onEntry, onTarget];
    } else {
      graphPath = [onEntry];
    }
  }

  const path = [];
  if (!segmentCrossesShelves(layout, start, onEntry, shelfId)) {
    pushIfFar(path, start);
  }
  for (const p of graphPath) pushIfFar(path, p);

  const aisleNear = path[path.length - 1] || onTarget;
  appendShelfApproach(path, layout, shelf, aisleNear);

  return path.filter((p, i, arr) => i === 0 || !eqPt(p, arr[i - 1]));
}

function appendShelfApproach(path, layout, shelf, aisleNear) {
  const info = shelfApproachPoint(shelf, layout, aisleNear);
  if (!info?.approach) return info;
  const last = path[path.length - 1];
  if (last && !segmentCrossesShelves(layout, last, info.approach, shelf.id)) {
    pushIfFar(path, info.approach, 0.12);
  }
  return info;
}

export function routeLengthMeters(path) {
  let total = 0;
  for (let i = 1; i < path.length; i += 1) {
    total += dist(path[i - 1], path[i]);
  }
  return total;
}

export function buildAisleWalkSteps(layout, route, entryPoint, shelfId) {
  if (!layout || !entryPoint || !shelfId || route.length < 2) return [];

  const shelf = (layout.shelves || []).find((s) => s.id === shelfId);
  if (!shelf) return [];

  const aisles = walkAisles(layout);
  const allShelves = layout.shelves || [];
  const targetAisle = aisles.find((a) => a.id === shelf.aisleId);
  const { lines } = buildAisleGraph(layout);
  const entrySnap = nearestCenterlinePoint(lines, route[0]);
  const entryAisle = entrySnap.aisle;
  const shelfLbl = shelfCanvasFaceLabel(shelf, "A", aisles, allShelves);
  const steps = [];

  steps.push({
    kind: "start",
    text: `You are here — ${entryPoint.label || "store entrance"}`,
  });

  if (targetAisle) {
    const aisleName = aisleDisplayLabel(targetAisle);
    if (entryAisle && entryAisle.id !== targetAisle.id) {
      steps.push({
        kind: "walk",
        text: "Follow the green line through the aisles",
      });
      steps.push({
        kind: "aisle",
        text: `Enter aisle ${aisleName}`,
      });
    } else {
      steps.push({
        kind: "aisle",
        text: `Walk to aisle ${aisleName}`,
      });
    }
    steps.push({
      kind: "shelf",
      text: `Find shelf ${shelfLbl}`,
    });
  } else {
    steps.push({
      kind: "walk",
      text: "Follow the green line on the map",
    });
  }

  steps.push({
    kind: "arrive",
    text: "Stop at the red pin — your product is on this shelf",
  });

  return steps;
}

export { shelfCenter, buildAisleGraph, segmentCrossesShelves };
