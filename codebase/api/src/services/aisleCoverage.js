/**
 * Guarantee every shelf binds to a walk aisle. Use thin “simple” aisles when
 * configured width does not fit; merge overlapping parallel corridors.
 */
import { randomUUID } from "node:crypto";
import {
  aisleFootprint,
  entityInsideLayout,
  layoutBoundaryPolygon,
  overlapsAnyShelf,
  shelfFloorFootprint,
} from "./polygonContainment.js";
import { shelfFrontNormal, shelfCenter, finalizeAisleShelfBinding, maxBindDistanceMeters } from "./aisleBinding.js";
import { isTemporaryStorageShelf } from "./temporaryStorage.js";

/** Absolute minimum walk strip (m) — customer can still pass single-file. */
export const SIMPLE_AISLE_MIN = 0.45;

const GAP = 0.05;

function rotNorm(shelf) {
  return (((Number(shelf.rotationDeg) || 0) % 360) + 360) % 360;
}

export function shelfRunAxisIsVertical(shelf) {
  const rot = rotNorm(shelf);
  return rot === 90 || rot === 270;
}

function layoutBounds(layout) {
  const poly = layoutBoundaryPolygon(layout);
  const xs = poly.map((p) => p.x);
  const ys = poly.map((p) => p.y);
  return {
    minX: Math.min(...xs),
    maxX: Math.max(...xs),
    minY: Math.min(...ys),
    maxY: Math.max(...ys),
  };
}

/** Clearance from a gondola face to the next fixture or polygon edge. */
export function measureFaceGap(shelf, faceSign, shelves, layout) {
  const { minX, maxX, minY, maxY } = layoutBounds(layout);
  const fp = shelfFloorFootprint(shelf);
  const n = shelfFrontNormal(shelf);
  const nx = n.x * faceSign;
  const ny = n.y * faceSign;
  const verticalRun = shelfRunAxisIsVertical(shelf);
  const parallelStart = verticalRun ? fp.y : fp.x;
  const parallelEnd = verticalRun ? fp.y + fp.d : fp.x + fp.w;

  let edge;
  let limit = Infinity;
  if (verticalRun) {
    edge = nx < 0 ? fp.x : fp.x + fp.w;
    limit = Math.min(limit, nx < 0 ? edge - minX : maxX - edge);
  } else {
    edge = ny < 0 ? fp.y : fp.y + fp.d;
    limit = Math.min(limit, ny < 0 ? edge - minY : maxY - edge);
  }

  for (const other of shelves || []) {
    if (other.id === shelf.id) continue;
    if (other.pairId && other.pairId === shelf.pairId) continue;
    const ofp = shelfFloorFootprint(other);
    const parallelOverlap =
      Math.min(parallelEnd, verticalRun ? ofp.y + ofp.d : ofp.x + ofp.w) -
      Math.max(parallelStart, verticalRun ? ofp.y : ofp.x);
    if (parallelOverlap < 0.15) continue;

    let dist;
    if (verticalRun) {
      dist = nx < 0 ? edge - (ofp.x + ofp.w) : ofp.x - edge;
    } else {
      dist = ny < 0 ? edge - (ofp.y + ofp.d) : ofp.y - edge;
    }
    if (dist > 0.02) limit = Math.min(limit, dist);
  }

  if (!Number.isFinite(limit) || limit > 4) return 1.2;
  return limit;
}

export function faceAisleSpec(shelf, faceSign, aisleWidth) {
  const fp = shelfFloorFootprint(shelf);
  const n = shelfFrontNormal(shelf);
  const nx = n.x * faceSign;
  const ny = n.y * faceSign;
  const w = Number(aisleWidth) || SIMPLE_AISLE_MIN;
  const verticalRun = shelfRunAxisIsVertical(shelf);

  if (verticalRun) {
    const edgeX = nx < 0 ? fp.x : fp.x + fp.w;
    const x = nx < 0 ? Number((edgeX - GAP - w).toFixed(3)) : Number((edgeX + GAP).toFixed(3));
    return {
      orientation: "vertical",
      x,
      y: fp.y,
      widthMeters: w,
      lengthMeters: Number(Math.max(0.5, fp.d).toFixed(3)),
    };
  }

  const edgeY = ny < 0 ? fp.y : fp.y + fp.d;
  const y = ny < 0 ? Number((edgeY - GAP - w).toFixed(3)) : Number((edgeY + GAP).toFixed(3));
  return {
    orientation: "horizontal",
    x: fp.x,
    y,
    widthMeters: w,
    lengthMeters: Number(Math.max(0.5, fp.w).toFixed(3)),
  };
}

function aisleHitsShelf(aisle, shelves, layout) {
  return Boolean(overlapsAnyShelf(aisle, { ...layout, shelves }));
}

function aisleRunSpan(a) {
  if (a.orientation === "vertical") {
    return { cross: Number(a.x), start: Number(a.y), end: Number(a.y) + Number(a.lengthMeters) };
  }
  return { cross: Number(a.y), start: Number(a.x), end: Number(a.x) + Number(a.lengthMeters) };
}

function mergeParallelAisles(a, b) {
  const ea = aisleRunSpan(a);
  const eb = aisleRunSpan(b);
  const start = Math.min(ea.start, eb.start);
  const end = Math.max(ea.end, eb.end);
  const width = Math.max(Number(a.widthMeters) || SIMPLE_AISLE_MIN, Number(b.widthMeters) || SIMPLE_AISLE_MIN);
  const cross = (ea.cross + eb.cross) / 2;
  if (a.orientation === "vertical") {
    a.x = Number(cross.toFixed(3));
    a.y = Number(start.toFixed(3));
    a.lengthMeters = Number((end - start).toFixed(2));
    a.widthMeters = Number(width.toFixed(3));
  } else {
    a.y = Number(cross.toFixed(3));
    a.x = Number(start.toFixed(3));
    a.lengthMeters = Number((end - start).toFixed(2));
    a.widthMeters = Number(width.toFixed(3));
  }
}

export function aisleOverlapArea(a, b, layout) {
  const fa = aisleFootprint(a, layout);
  const fb = aisleFootprint(b, layout);
  const ox = Math.max(0, Math.min(fa.x + fa.w, fb.x + fb.w) - Math.max(fa.x, fb.x));
  const oy = Math.max(0, Math.min(fa.y + fa.d, fb.y + fb.d) - Math.max(fa.y, fb.y));
  return ox * oy;
}

/** Merge same-orientation aisles that share cross-axis band AND are close/overlapping along the run. */
export function dedupeOverlappingParallelAisles(aisles, layout, { parallelTol = 0.22, maxRunJoin = 0.5 } = {}) {
  if (!aisles?.length) return [];
  const out = aisles.map((a) => ({ ...a }));
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < out.length; i += 1) {
      for (let j = i + 1; j < out.length; j += 1) {
        const a = out[i];
        const b = out[j];
        if (a.source === "manual" || b.source === "manual") continue;
        if (a.orientation !== b.orientation) continue;

        const ea = aisleRunSpan(a);
        const eb = aisleRunSpan(b);
        const crossNear = Math.abs(ea.cross - eb.cross) <= parallelTol;
        const runOverlap = Math.min(ea.end, eb.end) - Math.max(ea.start, eb.start);
        const runGap = Math.max(0, Math.max(ea.start, eb.start) - Math.min(ea.end, eb.end));
        const footprintOverlap = aisleOverlapArea(a, b, layout) > 0.02;
        // Require run proximity — crossNear alone used to bridge distant segments and
        // invent corridors through empty space (often outside the fixture polygon).
        const runJoinable = runGap <= maxRunJoin;

        if ((crossNear && runJoinable) || (footprintOverlap && runOverlap > 0.2)) {
          mergeParallelAisles(a, b);
          out.splice(j, 1);
          changed = true;
          break;
        }
      }
      if (changed) break;
    }
  }
  return out;
}

function widthForGap(gapM, preferredMin, strictMin = false) {
  const usable = Math.max(0, gapM - GAP);
  if (strictMin) {
    if (usable + 1e-6 < preferredMin) return null;
    return Number(Math.min(preferredMin, usable).toFixed(3));
  }
  if (usable < SIMPLE_AISLE_MIN - 0.02) return null;
  return Number(Math.min(preferredMin, Math.max(SIMPLE_AISLE_MIN, usable)).toFixed(3));
}

function faceSignForShelf(shelf) {
  return shelf?.pairRole === "back" ? -1 : 1;
}

function lastResortBindOpposite(shelf, front, aisles, layout) {
  if (!front?.aisleId) return null;
  const center = shelfCenter(shelf);
  const maxDist = maxBindDistanceMeters(layout);
  let best = null;
  let bestDist = Infinity;
  for (const aisle of aisles || []) {
    if (!aisle?.id || aisle.id === front.aisleId) continue;
    const fp = aisleFootprint(aisle, layout);
    const ac = { x: fp.x + fp.w / 2, y: fp.y + fp.d / 2 };
    const d = Math.hypot(ac.x - center.x, ac.y - center.y);
    if (d < bestDist && d <= maxDist) {
      bestDist = d;
      best = aisle;
    }
  }
  return best?.id || null;
}

function lastResortBindNearest(shelf, aisles, layout) {
  const center = shelfCenter(shelf);
  const maxDist = maxBindDistanceMeters(layout);
  let best = null;
  let bestDist = Infinity;
  for (const aisle of aisles || []) {
    if (!aisle?.id) continue;
    const fp = aisleFootprint(aisle, layout);
    const ac = { x: fp.x + fp.w / 2, y: fp.y + fp.d / 2 };
    const d = Math.hypot(ac.x - center.x, ac.y - center.y);
    if (d < bestDist && d <= maxDist) {
      bestDist = d;
      best = aisle;
    }
  }
  return best?.id || null;
}

function relaxedBindShelf(shelf, aisles, layout) {
  const faceSign = faceSignForShelf(shelf);
  const center = shelfCenter(shelf);
  const normal = shelfFrontNormal(shelf);
  const nx = normal.x * faceSign;
  const ny = normal.y * faceSign;
  const shelfFp = shelfFloorFootprint(shelf);
  let best = null;
  let bestScore = Infinity;

  for (const aisle of aisles || []) {
    if (!aisle?.id || aisle.id === "aisle-check") continue;
    const fp = aisleFootprint(aisle, layout);
    const ac = { x: fp.x + fp.w / 2, y: fp.y + fp.d / 2 };
    const dx = ac.x - center.x;
    const dy = ac.y - center.y;
    const along = dx * nx + dy * ny;
    if (along < -0.05) continue;

    const aisleIsVertical = aisle.orientation === "vertical";
    const overlap = aisleIsVertical
      ? Math.min(fp.y + fp.d, shelfFp.y + shelfFp.d) - Math.max(fp.y, shelfFp.y)
      : Math.min(fp.x + fp.w, shelfFp.x + shelfFp.w) - Math.max(fp.x, shelfFp.x);
    if (overlap < 0.05) continue;

    const score = along + Math.hypot(dx, dy) * 0.35;
    if (score < bestScore) {
      bestScore = score;
      best = aisle;
    }
  }
  return best?.id || null;
}

function tryAddSpanAisle(shelf, shelves, layout, preferredMin = SIMPLE_AISLE_MIN, strictMin = false) {
  const fp = shelfFloorFootprint(shelf);
  const faceSign = faceSignForShelf(shelf);
  const n = shelfFrontNormal(shelf);
  const nx = n.x * faceSign;
  const ny = n.y * faceSign;
  const w = strictMin ? preferredMin : SIMPLE_AISLE_MIN;
  const verticalRun = shelfRunAxisIsVertical(shelf);

  let spec;
  if (verticalRun) {
    const edgeX = nx < 0 ? fp.x : fp.x + fp.w;
    const x = nx < 0 ? Number((edgeX - GAP - w).toFixed(3)) : Number((edgeX + GAP).toFixed(3));
    spec = {
      orientation: "vertical",
      x,
      y: fp.y,
      widthMeters: w,
      lengthMeters: Number(fp.d.toFixed(3)),
    };
  } else {
    const edgeY = ny < 0 ? fp.y : fp.y + fp.d;
    const y = ny < 0 ? Number((edgeY - GAP - w).toFixed(3)) : Number((edgeY + GAP).toFixed(3));
    spec = {
      orientation: "horizontal",
      x: fp.x,
      y,
      widthMeters: w,
      lengthMeters: Number(fp.w.toFixed(3)),
    };
  }

  if (!entityInsideLayout(spec, "aisle", layout)) return null;
  if (aisleHitsShelf(spec, shelves, layout)) return null;
  return {
    ...spec,
    id: `aisle-${randomUUID().slice(0, 6)}`,
    name: "Walk aisle",
    source: "auto",
    path: [],
    categoryId: null,
    violations: [],
  };
}

function tryAddFaceAisle(shelf, shelves, layout, preferredMin, strictMin = false) {
  const faceSign = faceSignForShelf(shelf);
  const gapM = measureFaceGap(shelf, faceSign, shelves, layout);
  let width = widthForGap(gapM, preferredMin, strictMin);
  if (width == null) {
    if (strictMin) return null;
    width = SIMPLE_AISLE_MIN;
  }

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const spec = faceAisleSpec(shelf, faceSign, width);
    if (!entityInsideLayout(spec, "aisle", layout)) return null;
    if (!aisleHitsShelf(spec, shelves, layout)) {
      return {
        ...spec,
        id: `aisle-${randomUUID().slice(0, 6)}`,
        name: "Walk aisle",
        source: "auto",
        path: [],
        categoryId: null,
        violations: [],
      };
    }
    if (strictMin) return null;
    width = Number(Math.max(SIMPLE_AISLE_MIN, width - 0.12).toFixed(3));
    if (width <= SIMPLE_AISLE_MIN + 0.01) break;
  }
  return null;
}

export function enforceAisleMinimums(aisles, shelves, layout, minWidth, options = {}) {
  const min = Number(minWidth) || 1.2;
  const strict = options.strict === true;
  const referenced = new Set((shelves || []).map((s) => s.aisleId).filter(Boolean));
  const working = [];

  for (const aisle of aisles || []) {
    const w = Number(aisle.widthMeters) || 0;
    if (w >= min - 1e-6) {
      working.push({ ...aisle });
      continue;
    }
    if (strict && !referenced.has(aisle.id)) continue;
    working.push({
      ...aisle,
      widthMeters: Number(Math.max(w, min).toFixed(3)),
    });
  }

  return dedupeOverlappingParallelAisles(working, layout);
}

function aisleAreaSqm(aisle) {
  return (Number(aisle.lengthMeters) || 1) * (Number(aisle.widthMeters) || 1);
}

/**
 * True when two same-orientation walk aisles occupy the same strip (stacked).
 * Short leftover stubs are left alone so corner bays keep a face aisle.
 */
export function aislesAreCoincident(a, b, layout, { sameOrientRatio = 0.5, maxCrossSep = 0.28 } = {}) {
  if (!a || !b || a.orientation !== b.orientation) return false;
  if (Math.min(Number(a.lengthMeters) || 0, Number(b.lengthMeters) || 0) < 2.4) return false;
  const ea = aisleRunSpan(a);
  const eb = aisleRunSpan(b);
  if (Math.abs(ea.cross - eb.cross) > maxCrossSep) return false;
  const overlap = aisleOverlapArea(a, b, layout);
  if (overlap < 0.04) return false;
  const ratio = overlap / Math.max(0.01, Math.min(aisleAreaSqm(a), aisleAreaSqm(b)));
  return ratio >= sameOrientRatio;
}

/** Drop shorter aisles when footprints overlap (warehouse corridor cleanup). */
export function pruneOverlappingAisles(aisles, layout, minOverlapSqm = 0.08) {
  const sorted = [...(aisles || [])].sort((a, b) => aisleAreaSqm(b) - aisleAreaSqm(a));
  const kept = [];
  for (const candidate of sorted) {
    let blocked = false;
    for (const existing of kept) {
      if (aisleOverlapArea(candidate, existing, layout) > minOverlapSqm) {
        blocked = true;
        break;
      }
    }
    if (!blocked) kept.push(candidate);
  }
  return kept;
}

/**
 * Drop aisles stacked on another aisle. Keeps legitimate T/X crossings so mixed
 * packs still have a connected walk grid.
 */
export function pruneCoincidentAisles(aisles, layout) {
  const sorted = [...(aisles || [])].sort((a, b) => {
    if (a.source === "manual" && b.source !== "manual") return -1;
    if (b.source === "manual" && a.source !== "manual") return 1;
    return aisleAreaSqm(b) - aisleAreaSqm(a);
  });
  const kept = [];
  for (const candidate of sorted) {
    const blocked =
      candidate.source !== "manual" &&
      kept.some((existing) => aislesAreCoincident(candidate, existing, layout));
    if (!blocked) kept.push(candidate);
  }
  return kept;
}

/** Merge parallel warehouse corridors to full floor span (clean demo layout). */
export function extendWarehouseAislesToFloorSpan(aisles, layout, { margin = 0.1 } = {}) {
  const poly = layoutBoundaryPolygon(layout);
  const xs = poly.map((p) => p.x);
  const ys = poly.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return (aisles || []).map((a) => {
    if (a.source === "manual") return a;
    if (a.orientation === "vertical") {
      const y0 = Number((minY + margin).toFixed(3));
      const len = Number((maxY - minY - margin * 2).toFixed(2));
      return len > 0.5 ? { ...a, y: y0, lengthMeters: len } : a;
    }
    const x0 = Number((minX + margin).toFixed(3));
    const len = Number((maxX - minX - margin * 2).toFixed(2));
    return len > 0.5 ? { ...a, x: x0, lengthMeters: len } : a;
  });
}

/**
 * Create missing face aisles and re-bind until every shelf has aisleId.
 * @returns {{ shelves, aisles, created: number, unbound: number }}
 */
export function guaranteeEveryShelfHasAisle(shelves, aisles, layout, {
  preferredMinAisle = 1.2,
  strictMinAisle = false,
  skipSplit = false,
  skipCreate = false,
} = {}) {
  if (!shelves?.length) return { shelves: shelves || [], aisles: aisles || [], created: 0, unbound: 0 };

  let workingAisles = [...(aisles || [])];
  let created = 0;

  const bindOnce = () => finalizeAisleShelfBinding([...shelves], workingAisles, layout);

  let { shelves: bound } = bindOnce();

  for (const shelf of bound) {
    if (isTemporaryStorageShelf(shelf)) continue;
    if (shelf.aisleId) continue;
    if (skipCreate) continue;
    let added = tryAddFaceAisle(shelf, bound, layout, preferredMinAisle, strictMinAisle);
    if (!added) added = tryAddSpanAisle(shelf, bound, layout, preferredMinAisle, strictMinAisle);
    if (added) {
      workingAisles.push(added);
      created += 1;
    }
  }

  workingAisles = dedupeOverlappingParallelAisles(workingAisles, layout);
  if (!skipSplit) {
    workingAisles = splitWalkAislesClearOfShelves(workingAisles, bound, layout);
  }
  ({ shelves: bound, aisles: workingAisles } = bindOnce());

  for (const shelf of bound) {
    if (isTemporaryStorageShelf(shelf)) continue;
    if (shelf.aisleId) continue;
    if (skipCreate) continue;
    let added = tryAddFaceAisle(shelf, bound, layout, preferredMinAisle, strictMinAisle);
    if (!added) added = tryAddSpanAisle(shelf, bound, layout, preferredMinAisle, strictMinAisle);
    if (added) {
      workingAisles.push(added);
      created += 1;
    }
  }

  workingAisles = dedupeOverlappingParallelAisles(workingAisles, layout);
  if (!skipSplit) {
    workingAisles = splitWalkAislesClearOfShelves(workingAisles, bound, layout);
  }
  ({ shelves: bound, aisles: workingAisles } = bindOnce());

  for (const shelf of bound) {
    if (isTemporaryStorageShelf(shelf)) continue;
    if (shelf.aisleId) continue;
    const relaxed = relaxedBindShelf(shelf, workingAisles, layout);
    if (relaxed) {
      shelf.aisleId = relaxed;
      continue;
    }
    if (shelf.pairId && shelf.pairRole === "back") {
      const front = bound.find((s) => s.pairId === shelf.pairId && s.pairRole !== "back");
      if (front?.aisleId) {
        const span = tryAddSpanAisle(shelf, bound, layout, preferredMinAisle, strictMinAisle);
        if (span) {
          workingAisles.push(span);
          created += 1;
        }
      }
    }
  }
  ({ shelves: bound, aisles: workingAisles } = bindOnce());

  for (const shelf of bound) {
    if (isTemporaryStorageShelf(shelf)) continue;
    if (shelf.aisleId) continue;
    if (shelf.pairId && shelf.pairRole === "back") {
      const front = bound.find((s) => s.pairId === shelf.pairId && s.pairRole !== "back");
      const opposite = lastResortBindOpposite(shelf, front, workingAisles, layout);
      if (opposite) shelf.aisleId = opposite;
    }
    if (!shelf.aisleId) {
      const near = lastResortBindNearest(shelf, workingAisles, layout);
      if (near) shelf.aisleId = near;
    }
  }
  ({ shelves: bound, aisles: workingAisles } = bindOnce());

  const unbound = bound.filter((s) => !s.aisleId && !isTemporaryStorageShelf(s)).length;
  return { shelves: bound, aisles: workingAisles, created, unbound };
}

export function countUnboundShelves(shelves) {
  return (shelves || []).filter((s) => s && !s.pairDisplay && !s.aisleId && !isTemporaryStorageShelf(s)).length;
}

function footprintsOverlap(a, b, clearance = 0) {
  const c = Number(clearance) || 0;
  return !(
    a.x + a.w + c <= b.x + 1e-6 ||
    b.x + b.w + c <= a.x + 1e-6 ||
    a.y + a.d + c <= b.y + 1e-6 ||
    b.y + b.d + c <= a.y + 1e-6
  );
}

/** Split aisle bands into shelf-clear walk runs (same rules as layout packer). */
export function splitWalkAislesClearOfShelves(aisles, shelves, layout, { minRun = 0.5 } = {}) {
  const layoutCtx = { ...layout, shelves };
  const next = [];
  for (const a of aisles || []) {
    const band = aisleFootprint(a, layoutCtx);
    const isVert = a.orientation === "vertical";
    const axisStart = isVert ? band.y : band.x;
    const axisEnd = isVert ? band.y + band.d : band.x + band.w;

    const blocks = [];
    for (const s of shelves || []) {
      const fp = shelfFloorFootprint(s);
      if (!footprintsOverlap(band, fp, 0)) continue;
      blocks.push(isVert ? [fp.y, fp.y + fp.d] : [fp.x, fp.x + fp.w]);
    }
    blocks.sort((p, q) => p[0] - q[0]);
    const merged = [];
    for (const [b0, b1] of blocks) {
      if (!merged.length || b0 > merged[merged.length - 1][1] + 1e-6) {
        merged.push([b0, b1]);
      } else {
        merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], b1);
      }
    }

    const runs = [];
    let cursor = axisStart;
    for (const [b0, b1] of merged) {
      if (b0 > cursor + minRun - 1e-9) {
        runs.push([cursor, Math.min(b0, axisEnd)]);
      }
      cursor = Math.max(cursor, b1);
    }
    if (axisEnd > cursor + minRun - 1e-9) {
      runs.push([cursor, axisEnd]);
    }

    for (const [start, end] of runs) {
      const len = Number((end - start).toFixed(2));
      if (len < minRun) continue;
      const part = {
        ...a,
        id: a.id || `aisle-${randomUUID().slice(0, 6)}`,
        x: isVert ? a.x : Number(start.toFixed(3)),
        y: isVert ? Number(start.toFixed(3)) : a.y,
        lengthMeters: len,
      };
      if (!aisleHitsShelf(part, shelves, layout)) next.push(part);
    }
  }
  return next;
}
