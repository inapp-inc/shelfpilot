/**
 * Deterministic parallel-row aisle/shelf packer (no LLM).
 * Footprints must stay strictly inside the drawn polygon (not only AABB).
 *
 * Aisles are derived from the *actual inside runs* of the polygon at each band
 * (scan-based), so slanted / irregular drawn areas still get real corridors.
 * Supports "horizontal", "vertical", "mixed", and "auto" orientations.
 */
import { randomUUID } from "node:crypto";
import {
  aisleFootprint,
  entityInsideLayout,
  layoutBoundaryPolygon,
  maxLengthInsideX,
  maxLengthInsideY,
  overlapsAnyShelf,
  pointInPolygon,
  rectFullyInsidePolygon,
  shelfFloorFootprint,
  shelfInsidePolygon,
  overlapsAnyObstacle,
} from "./polygonContainment.js";
import { assignDisplayNumbers, countGondolaUnits, oppositeShelfOrigin, syncPairedShelfFootprints } from "./shelfFaces.js";
import { finalizeAisleShelfBinding, shelfCenter, shelfFrontNormal } from "./aisleBinding.js";
import {
  SIMPLE_AISLE_MIN,
  dedupeOverlappingParallelAisles,
  enforceAisleMinimums,
  extendWarehouseAislesToFloorSpan,
  guaranteeEveryShelfHasAisle,
  pruneCoincidentAisles,
  pruneOverlappingAisles,
  splitWalkAislesClearOfShelves,
} from "./aisleCoverage.js";
import { warehouseLayoutMode } from "./warehouseLayout.js";
import {
  finalizeAisleLabeling,
  quantizeAislePositions,
  quantizeFixturePositions,
} from "./aisleLabeling.js";

export function levelsForType(type, heightMeters, defaultLevels) {
  const h = Number(heightMeters) || 2;
  const count = Math.max(1, Number(defaultLevels) || ({ shelf: 2, gondola: 3, rack: 4, storage: 2, temp_table: 1, temp_pallet: 1, pallet_rack: 4, selective_rack: 5, bulk_storage: 3, staging_lane: 1 }[type] || 2));
  const levels = [];
  for (let i = 0; i < count; i++) {
    levels.push({
      levelIndex: i,
      heightFromFloorMeters: Number((0.3 + i * Math.max(0.35, (h - 0.4) / count)).toFixed(2)),
      clearanceMeters: Math.min(0.4, h / (count + 1)),
    });
  }
  return levels;
}

function resolveOrientation(orientation, widthMeters, depthMeters) {
  if (orientation === "horizontal") return "horizontal";
  if (orientation === "vertical") return "vertical";
  if (orientation === "mixed") return "mixed";
  // auto: varied pocket-by-pocket mix (same packer path as mixed)
  if (orientation === "auto") return "mixed";
  return widthMeters >= depthMeters ? "horizontal" : "vertical";
}

function polygonAreaMeters(poly) {
  if (!poly || poly.length < 3) return 0;
  let sum = 0;
  for (let i = 0; i < poly.length; i += 1) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    sum += a.x * b.y - b.x * a.y;
  }
  return Math.abs(sum) / 2;
}

/** Contiguous x-runs where a band [x, y, .., thickness] stays inside the polygon. */
function insideRunsAlongX(y, thickness, x0, x1, poly, step = 0.25) {
  const runs = [];
  let cur = null;
  for (let x = x0; x + step <= x1 + 1e-9; x = Number((x + step).toFixed(3))) {
    if (rectFullyInsidePolygon(x, y, step, thickness, poly)) {
      if (!cur) cur = { x, len: step };
      else cur.len = Number((cur.len + step).toFixed(3));
    } else if (cur) {
      runs.push(cur);
      cur = null;
    }
  }
  if (cur) runs.push(cur);
  return runs;
}

/** Contiguous y-runs where a band [x, y, thickness, ..] stays inside the polygon. */
function insideRunsAlongY(x, thickness, y0, y1, poly, step = 0.25) {
  const runs = [];
  let cur = null;
  for (let y = y0; y + step <= y1 + 1e-9; y = Number((y + step).toFixed(3))) {
    if (rectFullyInsidePolygon(x, y, thickness, step, poly)) {
      if (!cur) cur = { y, len: step };
      else cur.len = Number((cur.len + step).toFixed(3));
    } else if (cur) {
      runs.push(cur);
      cur = null;
    }
  }
  if (cur) runs.push(cur);
  return runs;
}

/**
 * @returns {{ aisles: object[], shelves: object[], aisleCount: number, shelfCount: number,
 *   durationMs: number, orientation: string, droppedOutsidePolygon: number, skippedOutsideCount: number }}
 */
export function packAislesAndShelves(layout, options = {}) {
  const started = performance.now();
  const warehouseMode = options.warehouseMode ?? warehouseLayoutMode(layout);
  const poly = layoutBoundaryPolygon(layout);
  const WALKABLE_MIN = SIMPLE_AISLE_MIN;
  const requestedMin = Number(options.minAisleWidthMeters) || 1.2;
  const minAisle = warehouseMode
    ? Math.max(WALKABLE_MIN, requestedMin)
    : Math.max(0.9, WALKABLE_MIN, requestedMin);
  const tmpl = options.shelfTemplate || {};
  const usable = Number(tmpl.usableWidthMeters) || 1.2;
  const depth = Number(tmpl.depthMeters) || 0.6;
  const height = Number(tmpl.heightMeters) || 2;
  const shelfType = tmpl.type || "shelf";
  const defaultLevels = tmpl.defaultLevels;
  const gap = 0.05;
  const compactMode = options.compactMode !== false;
  const fillRemaining = options.fillRemaining !== false;
  const margin = compactMode ? 0.1 : 0.2;
  const minAisleRun = warehouseMode
    ? Math.max(2.0, minAisle * 0.35)
    : Math.max(0.5, Math.min(minAisle, 0.85));
  /** Shortest bay we'll place as an endcap / leftover stub (meters). */
  const MIN_BAY_WIDTH = 0.6;

  /** Alternate Store Master sizes used to reclaim leftover strips / endcaps. */
  function buildFillSizes() {
    const raw = [];
    const push = (type, w, d, levels) => {
      const width = Number(w);
      const dep = Number(d);
      if (!(width > 0) || !(dep > 0)) return;
      raw.push({
        type: type || "shelf",
        w: Number(width.toFixed(3)),
        d: Number(dep.toFixed(3)),
        levels: levels ?? defaultLevels,
      });
    };
    push(shelfType, usable, depth, defaultLevels);
    push(shelfType, Math.max(MIN_BAY_WIDTH, usable * 0.5), depth, defaultLevels);
    for (const t of options.fillTemplates || []) {
      push(
        t.type || "shelf",
        t.usableWidthMeters ?? t.defaultWidthMeters,
        t.depthMeters ?? t.defaultDepthMeters,
        t.defaultLevels
      );
    }
    // Always offer compact stubs for vacant endcaps.
    if (!warehouseMode) {
      push("shelf", 1.2, 0.6, 2);
      push("shelf", 0.9, 0.5, 2);
      push("storage", 0.9, 0.6, 2);
      push("shelf", MIN_BAY_WIDTH, 0.5, 2);
    } else {
      push("selective_rack", 2.4, 1.0, 5);
      push("pallet_rack", 2.7, 1.1, 4);
      push("staging_lane", 2.0, 1.5, 1);
    }
    const seen = new Set();
    const out = [];
    for (const s of raw) {
      const key = `${s.type}:${s.w}x${s.d}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(s);
    }
    // Prefer larger bays first when claiming empty space; stubs still available.
    out.sort((a, b) => b.w * b.d - a.w * a.d);
    return out;
  }

  const fillSizes = buildFillSizes();

  const xs = poly.map((p) => p.x);
  const ys = poly.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const bw = maxX - minX;
  const bd = maxY - minY;

  const orient = resolveOrientation(options.orientation || "auto", bw, bd);

  const layoutForCheck = { ...layout, polygon: poly, shape: poly?.length >= 3 ? "polygon" : layout?.shape };

  const shelves = [];
  const aisles = [];
  let skippedOutsideCount = 0;
  let aisleSeq = 0;

  function makeShelf(x, y, rotationDeg, widthM, depthM, pairMeta = null, typeOverride = null, levelsOverride = null) {
    const rot = ((Number(rotationDeg) || 0) % 360 + 360) % 360;
    const type = typeOverride || shelfType;
    const w = Number(widthM) || usable;
    const d = Number(depthM) || depth;
    return {
      id: `shf-${randomUUID().slice(0, 6)}`,
      type,
      label:
        pairMeta?.pairRole === "back"
          ? "Shelf (back)"
          : pairMeta?.pairRole === "front"
            ? "Shelf (front)"
            : type === "storage"
              ? "Storage"
              : "Shelf",
      usableWidthMeters: w,
      widthMeters: w,
      depthMeters: d,
      heightMeters: height,
      x,
      y,
      rotationDeg: rot,
      aisleId: null,
      categoryId: null,
      color: undefined,
      doubleSided: false,
      pairId: pairMeta?.pairId || null,
      pairRole: pairMeta?.pairRole || null,
      faces: [{ id: "A", categoryId: null, planogram: [], facingDeg: rot }],
      levels: levelsForType(type, height, levelsOverride ?? defaultLevels),
      planogram: [],
    };
  }

  /** Two physical shelves sharing one footprint: front + back facing opposite aisles. */
  function makeShelfPair(x, y, rotationDeg, widthM, depthM, meta = {}) {
    const pairId = `pair-${randomUUID().slice(0, 8)}`;
    const type = meta.type || null;
    const levels = meta.levels ?? null;
    const front = makeShelf(x, y, rotationDeg, widthM, depthM, { pairId, pairRole: "front" }, type, levels);
    const backOrigin = oppositeShelfOrigin(x, y, rotationDeg, widthM, depthM);
    const back = makeShelf(
      backOrigin.x,
      backOrigin.y,
      backOrigin.rotationDeg,
      widthM,
      depthM,
      { pairId, pairRole: "back" },
      type,
      levels
    );
    if (meta.implicitAisleGap) {
      front.implicitAisleGap = true;
      back.implicitAisleGap = true;
    }
    return [front, back];
  }

  /** Collinear span along the run axis for merge checks. */
  function aisleRunSpan(a) {
    if (a.orientation === "vertical") {
      return { center: a.x, start: a.y, end: a.y + a.lengthMeters };
    }
    return { center: a.y, start: a.x, end: a.x + a.lengthMeters };
  }

  function canMergeCollinear(existing, candidate) {
    if (existing.orientation !== candidate.orientation) return false;
    const e = aisleRunSpan(existing);
    const c = aisleRunSpan(candidate);
    if (Math.abs(e.center - c.center) >= 0.15) return false;
    const overlap = Math.min(e.end, c.end) - Math.max(e.start, c.start);
    const minLen = Math.min(e.end - e.start, c.end - c.start);
    if (!(overlap > 0 && minLen > 0 && overlap / minLen > 0.8)) return false;
    // Never merge into one corridor that cuts through fixture rows.
    const start = Math.min(e.start, c.start);
    const end = Math.max(e.end, c.end);
    const mergedProbe =
      existing.orientation === "horizontal"
        ? { ...existing, x: start, lengthMeters: Number((end - start).toFixed(2)) }
        : { ...existing, y: start, lengthMeters: Number((end - start).toFixed(2)) };
    return !aisleHitsAnyShelf(mergedProbe);
  }

  function mergeCollinear(existing, candidate) {
    const e = aisleRunSpan(existing);
    const c = aisleRunSpan(candidate);
    const start = Math.min(e.start, c.start);
    const end = Math.max(e.end, c.end);
    if (existing.orientation === "horizontal") {
      existing.x = start;
      existing.lengthMeters = Number((end - start).toFixed(2));
    } else {
      existing.y = start;
      existing.lengthMeters = Number((end - start).toFixed(2));
    }
  }

  function aisleHitsAnyShelf(aisle) {
    return Boolean(overlapsAnyShelf(aisle, { ...layoutForCheck, shelves }));
  }

  function pushAisle(a) {
    const candidate = {
      id: "aisle-check",
      name: "Walk aisle",
      path: [],
      categoryId: null,
      color: undefined,
      violations: [],
      ...a,
    };
    if (candidate.orientation === "vertical") {
      const trimmed = maxLengthInsideY(
        candidate.x,
        candidate.y,
        candidate.widthMeters,
        candidate.lengthMeters,
        poly
      );
      if (trimmed < minAisleRun) {
        skippedOutsideCount += 1;
        return;
      }
      candidate.lengthMeters = trimmed;
    } else {
      const trimmed = maxLengthInsideX(
        candidate.x,
        candidate.y,
        candidate.lengthMeters,
        candidate.widthMeters,
        poly
      );
      if (trimmed < minAisleRun) {
        skippedOutsideCount += 1;
        return;
      }
      candidate.lengthMeters = trimmed;
    }
    if (!entityInsideLayout(candidate, "aisle", layoutForCheck)) {
      skippedOutsideCount += 1;
      return;
    }
    if (aisleHitsAnyShelf(candidate)) {
      skippedOutsideCount += 1;
      return;
    }
    for (const existing of aisles) {
      if (canMergeCollinear(existing, candidate)) {
        mergeCollinear(existing, candidate);
        return;
      }
    }
    aisles.push({
      ...candidate,
      id: `aisle-${randomUUID().slice(0, 6)}`,
      name: `Walk aisle ${++aisleSeq}`,
      source: "auto",
      path: candidate.path || [],
      categoryId: null,
      color: undefined,
      violations: [],
    });
  }

  function scanHorizontalAisles(y, x0, x1) {
    for (const run of insideRunsAlongX(y, minAisle, x0 + margin, x1 - margin, poly)) {
      if (run.len >= minAisleRun) {
        pushAisle({
          orientation: "horizontal",
          x: run.x,
          y,
          widthMeters: minAisle,
          lengthMeters: Number(run.len.toFixed(2)),
        });
      }
    }
  }

  function scanVerticalAisles(x, y0, y1) {
    for (const run of insideRunsAlongY(x, minAisle, y0 + margin, y1 - margin, poly)) {
      if (run.len >= minAisleRun) {
        pushAisle({
          orientation: "vertical",
          x,
          y: run.y,
          widthMeters: minAisle,
          lengthMeters: Number(run.len.toFixed(2)),
        });
      }
    }
  }

  /** Optional cross-corridor grid — mixed layouts only when explicitly requested. */
  function fillCrossCorridors(primaryOrient) {
    const step = minAisle + gap;
    if (primaryOrient === "horizontal" || primaryOrient === "mixed") {
      for (let x = minX + margin; x + minAisle <= maxX - margin + 1e-9; x = Number((x + step).toFixed(3))) {
        scanVerticalAisles(x, minY, maxY);
      }
    }
    if (primaryOrient === "vertical" || primaryOrient === "mixed") {
      for (let y = minY + margin; y + minAisle <= maxY - margin + 1e-9; y = Number((y + step).toFixed(3))) {
        scanHorizontalAisles(y, minX, maxX);
      }
    }
  }

  function placeGondolaRowHorizontal(gondolaY, x0, x1, bayOpts = {}) {
    const bayW = Number(bayOpts.bayWidth) || usable;
    const bayD = Number(bayOpts.bayDepth) || depth;
    const minBay = Math.min(MIN_BAY_WIDTH, bayW);
    const type = bayOpts.type || null;
    const levels = bayOpts.levels ?? null;
    let pairsPlaced = 0;
    let x = x0 + margin;
    while (x + minBay <= x1 - margin + 1e-9) {
      const remain = Number((x1 - margin - x).toFixed(3));
      const w = remain >= bayW - 1e-9 ? bayW : remain >= minBay - 1e-9 ? remain : null;
      if (w == null) break;
      if (shelfFitsAt(x, gondolaY, 0, w, bayD)) {
        if (warehouseMode) {
          shelves.push(makeShelf(x, gondolaY, 0, w, bayD, {}, type, levels));
        } else {
          shelves.push(...makeShelfPair(x, gondolaY, 0, w, bayD, { type, levels }));
        }
        pairsPlaced += 1;
        x = Number((x + w + gap).toFixed(3));
      } else {
        skippedOutsideCount += 1;
        // Skip a full bay pitch — never crawl 0.25 m into a colliding slot.
        x = Number((x + bayW + gap).toFixed(3));
      }
    }
    return pairsPlaced;
  }

  function placeGondolaRowVertical(gondolaX, y0, y1, bayOpts = {}) {
    const bayW = Number(bayOpts.bayWidth) || usable;
    const bayD = Number(bayOpts.bayDepth) || depth;
    const minBay = Math.min(MIN_BAY_WIDTH, bayW);
    const type = bayOpts.type || null;
    const levels = bayOpts.levels ?? null;
    let pairsPlaced = 0;
    let y = y0 + margin;
    while (y + minBay <= y1 - margin + 1e-9) {
      const remain = Number((y1 - margin - y).toFixed(3));
      const w = remain >= bayW - 1e-9 ? bayW : remain >= minBay - 1e-9 ? remain : null;
      if (w == null) break;
      if (shelfFitsAt(gondolaX, y, 90, w, bayD)) {
        if (warehouseMode) {
          shelves.push(makeShelf(gondolaX, y, 90, w, bayD, {}, type, levels));
        } else {
          shelves.push(...makeShelfPair(gondolaX, y, 90, w, bayD, { type, levels }));
        }
        pairsPlaced += 1;
        y = Number((y + w + gap).toFixed(3));
      } else {
        skippedOutsideCount += 1;
        y = Number((y + bayW + gap).toFixed(3));
      }
    }
    return pairsPlaced;
  }

  /**
   * One runway strip: [north walk] → gondola row → [south walk].
   * skipNorthAisle when south boundary of previous strip is reused.
   */
  function packRunwayStripHorizontal(yNorth, x0, x1, y1, { skipNorthAisle = false } = {}) {
    const gondolaY = Number((yNorth + minAisle + gap).toFixed(3));
    if (gondolaY + depth > y1 - margin + 1e-9) {
      return { pairsPlaced: 0, southAisleY: null, nextNorthY: null };
    }
    const pairsPlaced = placeGondolaRowHorizontal(gondolaY, x0, x1);
    if (pairsPlaced === 0) {
      return { pairsPlaced: 0, southAisleY: null, nextNorthY: null };
    }
    if (!skipNorthAisle) {
      scanHorizontalAisles(yNorth, x0, x1);
    }
    const southAisleY = Number((gondolaY + depth + gap).toFixed(3));
    if (southAisleY + minAisle > y1 - margin + 1e-9) {
      return { pairsPlaced, southAisleY: null, nextNorthY: null };
    }
    scanHorizontalAisles(southAisleY, x0, x1);
    return { pairsPlaced, southAisleY, nextNorthY: southAisleY };
  }

  function packRunwayStripVertical(xWest, y0, y1, x1, { skipWestAisle = false } = {}) {
    const gondolaX = Number((xWest + minAisle + gap).toFixed(3));
    if (gondolaX + depth > x1 - margin + 1e-9) {
      return { pairsPlaced: 0, eastAisleX: null, nextWestX: null };
    }
    const pairsPlaced = placeGondolaRowVertical(gondolaX, y0, y1);
    if (pairsPlaced === 0) {
      return { pairsPlaced: 0, eastAisleX: null, nextWestX: null };
    }
    if (!skipWestAisle) {
      scanVerticalAisles(xWest, y0, y1);
    }
    const eastAisleX = Number((gondolaX + depth + gap).toFixed(3));
    if (eastAisleX + minAisle > x1 - margin + 1e-9) {
      return { pairsPlaced, eastAisleX: null, nextWestX: null };
    }
    scanVerticalAisles(eastAisleX, y0, y1);
    return { pairsPlaced, eastAisleX, nextWestX: eastAisleX };
  }

  /** Compact strip: reuse aisle at yStart/xStart when continuing a runway leftover. */
  function packCompactStripHorizontal(yStart, x0, x1, y1, { aisleAtStart = false } = {}) {
    let northAisleY = aisleAtStart ? yStart : Number((yStart + margin).toFixed(3));
    let any = false;
    while (true) {
      const gondolaY = Number((northAisleY + minAisle + gap).toFixed(3));
      if (gondolaY + depth > y1 - margin + 1e-9) break;
      scanHorizontalAisles(northAisleY, x0, x1);
      const placed = placeGondolaRowHorizontal(gondolaY, x0, x1);
      if (placed === 0) break;
      any = true;
      const southY = Number((gondolaY + depth + gap).toFixed(3));
      if (southY + minAisle > y1 - margin + 1e-9) break;
      scanHorizontalAisles(southY, x0, x1);
      northAisleY = southY;
    }
    return any;
  }

  function packCompactStripVertical(xStart, y0, y1, x1, { aisleAtStart = false } = {}) {
    let westAisleX = aisleAtStart ? xStart : Number((xStart + margin).toFixed(3));
    let any = false;
    while (true) {
      const gondolaX = Number((westAisleX + minAisle + gap).toFixed(3));
      if (gondolaX + depth > x1 - margin + 1e-9) break;
      scanVerticalAisles(westAisleX, y0, y1);
      const placed = placeGondolaRowVertical(gondolaX, y0, y1);
      if (placed === 0) break;
      any = true;
      const eastX = Number((gondolaX + depth + gap).toFixed(3));
      if (eastX + minAisle > x1 - margin + 1e-9) break;
      scanVerticalAisles(eastX, y0, y1);
      westAisleX = eastX;
    }
    return any;
  }

  function extendAllAislesToPolygon() {
    // Face-derived aisles are rebuilt after packing; no full-span extension.
  }

  function shelfRunAxisIsVertical(shelf) {
    const rot = ((Number(shelf.rotationDeg) || 0) % 360 + 360) % 360;
    return rot === 90 || rot === 270;
  }

  /** Walk width for a face gap: use configured min when space allows; skip tight gaps. */
  function aisleWidthForGap(gapMeters) {
    const usable = gapMeters - gap;
    if (usable + 1e-6 < minAisle) return null;
    return Number(Math.min(minAisle, usable).toFixed(3));
  }

  /** Clearance from a gondola face to the next shelf or polygon edge along the face normal. */
  function measureFaceGap(shelf, faceSign) {
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

    for (const other of shelves) {
      if (other.pairId && other.pairId === shelf.pairId) continue;
      const ofp = shelfFloorFootprint(other);
      const parallelOverlap =
        Math.min(parallelEnd, verticalRun ? ofp.y + ofp.d : ofp.x + ofp.w) -
        Math.max(parallelStart, verticalRun ? ofp.y : ofp.x);
      if (parallelOverlap < 0.2) continue;

      let dist;
      if (verticalRun) {
        dist = nx < 0 ? edge - (ofp.x + ofp.w) : ofp.x - edge;
      } else {
        dist = ny < 0 ? edge - (ofp.y + ofp.d) : ofp.y - edge;
      }
      if (dist > 0.02) limit = Math.min(limit, dist);
    }

    if (!Number.isFinite(limit) || limit > minAisle * 4) return minAisle;
    return limit;
  }

  function faceAisleSpec(shelf, faceSign, aisleWidth) {
    const fp = shelfFloorFootprint(shelf);
    const n = shelfFrontNormal(shelf);
    const nx = n.x * faceSign;
    const ny = n.y * faceSign;
    const w = Number(aisleWidth) || minAisle;
    const verticalRun = shelfRunAxisIsVertical(shelf);

    if (verticalRun) {
      const edgeX = nx < 0 ? fp.x : fp.x + fp.w;
      const x = nx < 0 ? Number((edgeX - gap - w).toFixed(3)) : Number((edgeX + gap).toFixed(3));
      return {
        orientation: "vertical",
        x,
        y: fp.y,
        widthMeters: w,
        lengthMeters: Number(fp.d.toFixed(3)),
      };
    }

    const edgeY = ny < 0 ? fp.y : fp.y + fp.d;
    const y = ny < 0 ? Number((edgeY - gap - w).toFixed(3)) : Number((edgeY + gap).toFixed(3));
    return {
      orientation: "horizontal",
      x: fp.x,
      y,
      widthMeters: w,
      lengthMeters: Number(fp.w.toFixed(3)),
    };
  }

  /**
   * One walk strip per gondola face — returned as candidates; consolidated before publish.
   * Width uses configured minAisle when space allows; shrinks down to WALKABLE_MIN when tight.
   */
  function buildShelfFaceAisles() {
    const candidates = [];
    const leads = shelves.filter((s) => s.pairRole !== "back");
    for (const s of leads) {
      const faceSigns = warehouseMode ? [1] : [1, -1];
      for (const faceSign of faceSigns) {
        const gapM = measureFaceGap(s, faceSign);
        const width = aisleWidthForGap(gapM);
        if (width == null) continue;
        const spec = faceAisleSpec(s, faceSign, width);
        if (!entityInsideLayout(spec, "aisle", layoutForCheck)) {
          skippedOutsideCount += 1;
          continue;
        }
        if (aisleHitsAnyShelf(spec)) {
          skippedOutsideCount += 1;
          continue;
        }
        candidates.push({ ...spec, source: "auto" });
      }
    }
    return candidates;
  }

  /**
   * Merge collinear face strips that sit on nearby row/column bands or with small gaps along the run.
   */
  function consolidateNearbyAisles(candidates) {
    if (!candidates?.length) return [];
    const parallelTol = Math.max(0.2, minAisle * 0.22);
    const runJoin = gap + 0.3;

    function clusterAndMerge(list, vertical) {
      const clusters = [];
      for (const a of list) {
        const cross = vertical ? Number(a.x) : Number(a.y);
        const runStart = vertical ? Number(a.y) : Number(a.x);
        const runEnd = runStart + Number(a.lengthMeters);
        const width = Number(a.widthMeters) || minAisle;

        let cluster = clusters.find((c) => Math.abs(c.cross - cross) <= parallelTol);
        if (!cluster) {
          cluster = { cross, segments: [] };
          clusters.push(cluster);
        } else {
          cluster.cross = (cluster.cross * cluster.segments.length + cross) / (cluster.segments.length + 1);
        }
        cluster.segments.push({ start: runStart, end: runEnd, width });
      }

      const out = [];
      for (const cluster of clusters) {
        cluster.segments.sort((p, q) => p.start - q.start);
        const merged = [];
        for (const seg of cluster.segments) {
          if (!merged.length || seg.start > merged[merged.length - 1].end + runJoin) {
            merged.push({ start: seg.start, end: seg.end, width: seg.width });
          } else {
            const last = merged[merged.length - 1];
            last.end = Math.max(last.end, seg.end);
            last.width = Math.max(last.width, seg.width);
          }
        }
        for (const seg of merged) {
          const len = seg.end - seg.start;
          if (len < minAisleRun) continue;
          if (vertical) {
            out.push({
              orientation: "vertical",
              x: Number(cluster.cross.toFixed(3)),
              y: Number(seg.start.toFixed(3)),
              widthMeters: Number(seg.width.toFixed(3)),
              lengthMeters: Number(len.toFixed(2)),
              source: "auto",
            });
          } else {
            out.push({
              orientation: "horizontal",
              x: Number(seg.start.toFixed(3)),
              y: Number(cluster.cross.toFixed(3)),
              widthMeters: Number(seg.width.toFixed(3)),
              lengthMeters: Number(len.toFixed(2)),
              source: "auto",
            });
          }
        }
      }
      return out;
    }

    const horiz = candidates.filter((a) => a.orientation !== "vertical");
    const vert = candidates.filter((a) => a.orientation === "vertical");
    return [...clusterAndMerge(horiz, false), ...clusterAndMerge(vert, true)];
  }

  /** Stretch merged bands so edge bays and endcaps still overlap their walk corridor. */
  function extendAislesToShelfFaces() {
    for (const a of aisles) {
      if (a.source === "manual") continue;
      if (a.orientation === "vertical") {
        let y0 = Number(a.y) || 0;
        let y1 = y0 + (Number(a.lengthMeters) || 0);
        const ax = Number(a.x) || 0;
        for (const s of shelves) {
          if (s.pairRole === "back" || !shelfRunAxisIsVertical(s)) continue;
          const fp = shelfFloorFootprint(s);
          const westX = Number((fp.x - gap - a.widthMeters).toFixed(3));
          const eastX = Number((fp.x + fp.w + gap).toFixed(3));
          if (Math.abs(ax - westX) > 0.12 && Math.abs(ax - eastX) > 0.12) continue;
          y0 = Math.min(y0, fp.y);
          y1 = Math.max(y1, fp.y + fp.d);
        }
        a.y = Number(y0.toFixed(3));
        a.lengthMeters = Number((y1 - y0).toFixed(2));
        continue;
      }

      let x0 = Number(a.x) || 0;
      let x1 = x0 + (Number(a.lengthMeters) || 0);
      const ay = Number(a.y) || 0;
      for (const s of shelves) {
        if (s.pairRole === "back" || shelfRunAxisIsVertical(s)) continue;
        const fp = shelfFloorFootprint(s);
        const northY = Number((fp.y - gap - a.widthMeters).toFixed(3));
        const southY = Number((fp.y + fp.d + gap).toFixed(3));
        if (Math.abs(ay - northY) > 0.12 && Math.abs(ay - southY) > 0.12) continue;
        x0 = Math.min(x0, fp.x);
        x1 = Math.max(x1, fp.x + fp.w);
      }
      a.x = Number(x0.toFixed(3));
      a.lengthMeters = Number((x1 - x0).toFixed(2));
    }
  }

  /**
   * Split each aisle into walkable runs that do not cross shelf footprints.
   * Shoppers walk between fixtures, never through them.
   */
  function splitAislesClearOfShelves() {
    const layoutCtx = { ...layoutForCheck, shelves };
    const next = [];
    for (const a of aisles) {
      const band = aisleFootprint(a, layoutCtx);
      const isVert = a.orientation === "vertical";
      const axisStart = isVert ? band.y : band.x;
      const axisEnd = isVert ? band.y + band.d : band.x + band.w;

      const blocks = [];
      for (const s of shelves) {
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
        if (b0 > cursor + minAisleRun - 1e-9) {
          runs.push([cursor, Math.min(b0, axisEnd)]);
        }
        cursor = Math.max(cursor, b1);
      }
      if (axisEnd > cursor + minAisleRun - 1e-9) {
        runs.push([cursor, axisEnd]);
      }

      if (!runs.length) {
        skippedOutsideCount += 1;
        continue;
      }
      for (const [start, end] of runs) {
        const len = Number((end - start).toFixed(2));
        if (len < minAisleRun) continue;
        const part = {
          ...a,
          id: `aisle-${randomUUID().slice(0, 6)}`,
          x: isVert ? a.x : Number(start.toFixed(3)),
          y: isVert ? Number(start.toFixed(3)) : a.y,
          lengthMeters: len,
        };
        if (!aisleHitsAnyShelf(part)) next.push(part);
      }
    }
    aisles.length = 0;
    aisles.push(...next);
  }

  /** Add walk aisles along every gondola face using floor footprints and full polygon runs. */
  function ensureWalkAislesFromShelves() {
    const seen = new Set();
    const scanFullHorizontal = (y) => {
      const key = `h@${y.toFixed(2)}`;
      if (seen.has(key)) return;
      seen.add(key);
      scanHorizontalAisles(y, minX + margin, maxX - margin);
    };
    const scanFullVertical = (x) => {
      const key = `v@${x.toFixed(2)}`;
      if (seen.has(key)) return;
      seen.add(key);
      scanVerticalAisles(x, minY + margin, maxY - margin);
    };

    for (const s of shelves) {
      if (s.pairRole === "back") continue;
      const fp = shelfFloorFootprint(s);
      scanFullHorizontal(Number((fp.y - gap - minAisle).toFixed(3)));
      scanFullHorizontal(Number((fp.y + fp.d + gap).toFixed(3)));
      scanFullVertical(Number((fp.x - gap - minAisle).toFixed(3)));
      scanFullVertical(Number((fp.x + fp.w + gap).toFixed(3)));
    }

    // Perimeter walk bands so edge columns and irregular wings still get corridors.
    scanFullHorizontal(minY + margin);
    scanFullHorizontal(maxY - margin - minAisle);
    scanFullVertical(minX + margin);
    scanFullVertical(maxX - margin - minAisle);
  }

  /** Warehouse: aisle → rack column → aisle (single-sided, no overlapping corridors). */
  function packWarehouseVerticalRegion(x0, y0, x1, y1) {
    let xAisle = Number((x0 + margin).toFixed(3));
    const xEnd = x1 - margin;
    const y0r = y0 + margin;
    const y1r = y1 - margin;
    if (xAisle + minAisle > xEnd + 1e-9) return;
    scanVerticalAisles(xAisle, y0r, y1r);
    while (true) {
      const rackX = Number((xAisle + minAisle + gap + depth).toFixed(3));
      if (rackX > xEnd + 1e-9) break;
      const placed = placeGondolaRowVertical(rackX, y0r, y1r);
      if (placed === 0) break;
      xAisle = Number((rackX + gap).toFixed(3));
      if (xAisle + minAisle > xEnd + 1e-9) break;
      scanVerticalAisles(xAisle, y0r, y1r);
    }
  }

  function packWarehouseHorizontalRegion(x0, y0, x1, y1) {
    let yAisle = Number((y0 + margin).toFixed(3));
    const yEnd = y1 - margin;
    const x0r = x0 + margin;
    const x1r = x1 - margin;
    if (yAisle + minAisle > yEnd + 1e-9) return;
    scanHorizontalAisles(yAisle, x0r, x1r);
    while (true) {
      const rackY = Number((yAisle + minAisle + gap + depth).toFixed(3));
      if (rackY > yEnd + 1e-9) break;
      const placed = placeGondolaRowHorizontal(rackY, x0r, x1r);
      if (placed === 0) break;
      yAisle = Number((rackY + gap).toFixed(3));
      if (yAisle + minAisle > yEnd + 1e-9) break;
      scanHorizontalAisles(yAisle, x0r, x1r);
    }
  }

  /** Pack runway strips inside a sub-rectangle (clipped to polygon). */
  function packRegion(x0, y0, x1, y1, regionOrient) {
    if (x1 - x0 < MIN_BAY_WIDTH || y1 - y0 < Math.min(depth, 0.5)) return;
    if (warehouseMode) {
      if (regionOrient === "horizontal") packWarehouseHorizontalRegion(x0, y0, x1, y1);
      else packWarehouseVerticalRegion(x0, y0, x1, y1);
      return;
    }
    const runwaySpan = minAisle + gap + depth + gap + minAisle;
    // When an aisle already exists at the start, one more gondola band needs aisle+gap+depth.
    const reuseAisleMin = minAisle + gap + depth;

    if (regionOrient === "horizontal") {
      let yNorth = y0 + margin;
      let skipNorth = false;
      let placedAny = false;
      while (yNorth + minAisle + gap + depth <= y1 - margin + 1e-9) {
        const remaining = y1 - margin - yNorth;
        if (remaining >= runwaySpan) {
          const strip = packRunwayStripHorizontal(yNorth, x0, x1, y1, { skipNorthAisle: skipNorth });
          if (strip.pairsPlaced === 0) break;
          placedAny = true;
          if (strip.southAisleY == null) break;
          yNorth = strip.nextNorthY;
          skipNorth = true;
        } else if (compactMode && remaining >= reuseAisleMin) {
          // Continue from existing north aisle — do not re-add margin/aisle offset.
          if (packCompactStripHorizontal(yNorth, x0, x1, y1, { aisleAtStart: true })) {
            placedAny = true;
          }
          break;
        } else {
          break;
        }
      }
      if (!placedAny && y1 - y0 >= reuseAisleMin && compactMode) {
        packCompactStripHorizontal(y0, x0, x1, y1, { aisleAtStart: false });
      }
    } else {
      let xWest = x0 + margin;
      let skipWest = false;
      let placedAny = false;
      while (xWest + minAisle + gap + depth <= x1 - margin + 1e-9) {
        const remaining = x1 - margin - xWest;
        if (remaining >= runwaySpan) {
          const strip = packRunwayStripVertical(xWest, y0, y1, x1, { skipWestAisle: skipWest });
          if (strip.pairsPlaced === 0) break;
          placedAny = true;
          if (strip.eastAisleX == null) break;
          xWest = strip.nextWestX;
          skipWest = true;
        } else if (compactMode && remaining >= reuseAisleMin) {
          if (packCompactStripVertical(xWest, y0, y1, x1, { aisleAtStart: true })) {
            placedAny = true;
          }
          break;
        } else {
          break;
        }
      }
      if (!placedAny && x1 - x0 >= reuseAisleMin && compactMode) {
        packCompactStripVertical(x0, y0, y1, x1, { aisleAtStart: false });
      }
    }
  }

  function tentativeShelf(x, y, rotationDeg, widthM, depthM) {
    return {
      x,
      y,
      rotationDeg,
      usableWidthMeters: widthM,
      widthMeters: widthM,
      depthMeters: depthM,
    };
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

  function overlapsExistingShelf(tentative) {
    const fp = shelfFloorFootprint(tentative);
    // Require a small clearance so fixtures never render as touching/overlapping.
    const clearance = 0.02;
    for (const s of shelves) {
      if (footprintsOverlap(fp, shelfFloorFootprint(s), clearance)) return true;
    }
    return false;
  }

  /** Safety net: keep first unit in each footprint; drop later collisions (never overlap). */
  function dropOverlappingShelfUnits(list) {
    const units = [];
    const seenPair = new Set();
    for (const s of list) {
      if (s.pairId) {
        if (seenPair.has(s.pairId)) continue;
        seenPair.add(s.pairId);
        units.push(list.filter((x) => x.pairId === s.pairId));
      } else {
        units.push([s]);
      }
    }
    const keptFps = [];
    const out = [];
    const clearance = 0.02;
    for (const unit of units) {
      const lead = unit.find((u) => u.pairRole !== "back") || unit[0];
      const fp = shelfFloorFootprint(lead);
      if (keptFps.some((k) => footprintsOverlap(k, fp, clearance))) {
        skippedOutsideCount += 1;
        continue;
      }
      keptFps.push(fp);
      out.push(...unit);
    }
    return out;
  }

  function blocksEntryClearance(tentative) {
    const entry = layout?.entryPoints?.[0];
    if (!entry) return false;
    const c = shelfCenter(tentative);
    const dx = c.x - Number(entry.x);
    const dy = c.y - Number(entry.y);
    const r = minAisle + 0.35;
    return dx * dx + dy * dy < r * r;
  }

  function aisleFootprint(a) {
    if (a.orientation === "vertical") {
      return { x: a.x, y: a.y, w: a.widthMeters, d: a.lengthMeters };
    }
    return { x: a.x, y: a.y, w: a.lengthMeters, d: a.widthMeters };
  }

  function overlapsAnyAisle(tentative) {
    const fp = shelfFloorFootprint(tentative);
    for (const a of aisles) {
      if (footprintsOverlap(fp, aisleFootprint(a))) return true;
    }
    return false;
  }

  function shelfFitsAt(x, y, rotationDeg, widthM, depthM, { avoidAisles = false } = {}) {
    const t = tentativeShelf(x, y, rotationDeg, widthM, depthM);
    if (!shelfInsidePolygon(t, poly)) return false;
    if (overlapsExistingShelf(t)) return false;
    // Only leftover-fill avoids aisle AABBs — main runway packing places gondolas
    // flush beside aisles, and AABB footprints can touch/overlap aisle bands.
    if (avoidAisles && overlapsAnyAisle(t)) return false;
    if (blocksEntryClearance(t)) return false;
    if (overlapsAnyObstacle(t, layoutForCheck)) return false;
    return true;
  }

  /**
   * Place a pair when both faces fit; otherwise a single-sided shelf/storage bay
   * for shallow leftovers (endcaps, edge strips).
   */
  function tryPlaceFillUnit(x, y, rotationDeg, size) {
    const w = size.w;
    const d = size.d;
    const fitOpts = { avoidAisles: true };
    if (!shelfFitsAt(x, y, rotationDeg, w, d, fitOpts)) return 0;
    const backOrigin = oppositeShelfOrigin(x, y, rotationDeg, w, d);
    const backFits = shelfFitsAt(
      backOrigin.x,
      backOrigin.y,
      backOrigin.rotationDeg,
      w,
      d,
      fitOpts
    );
    if (backFits && size.type !== "storage") {
      shelves.push(...makeShelfPair(x, y, rotationDeg, w, d, { type: size.type, levels: size.levels }));
      return 2;
    }
    // Single bay — useful for endcaps and shallow edge strips.
    shelves.push(makeShelf(x, y, rotationDeg, w, d, null, size.type, size.levels));
    return 1;
  }

  function fillAlongHorizontalRow(gondolaY, x0, x1, sizes) {
    let placed = 0;
    let x = x0 + margin;
    while (x + MIN_BAY_WIDTH <= x1 - margin + 1e-9) {
      let did = false;
      for (const size of sizes) {
        const remain = Number((x1 - margin - x).toFixed(3));
        if (remain + 1e-9 < Math.min(size.w, MIN_BAY_WIDTH)) continue;
        const w = remain >= size.w - 1e-9 ? size.w : remain;
        if (w + 1e-9 < MIN_BAY_WIDTH) continue;
        const n = tryPlaceFillUnit(x, gondolaY, 0, { ...size, w });
        if (n > 0) {
          placed += n;
          x = Number((x + w + gap).toFixed(3));
          did = true;
          break;
        }
      }
      if (!did) x = Number((x + MIN_BAY_WIDTH + gap).toFixed(3));
    }
    return placed;
  }

  function fillAlongVerticalCol(gondolaX, y0, y1, sizes) {
    let placed = 0;
    let y = y0 + margin;
    while (y + MIN_BAY_WIDTH <= y1 - margin + 1e-9) {
      let did = false;
      for (const size of sizes) {
        const remain = Number((y1 - margin - y).toFixed(3));
        if (remain + 1e-9 < Math.min(size.w, MIN_BAY_WIDTH)) continue;
        const w = remain >= size.w - 1e-9 ? size.w : remain;
        if (w + 1e-9 < MIN_BAY_WIDTH) continue;
        const n = tryPlaceFillUnit(gondolaX, y, 90, { ...size, w });
        if (n > 0) {
          placed += n;
          y = Number((y + w + gap).toFixed(3));
          did = true;
          break;
        }
      }
      if (!did) y = Number((y + MIN_BAY_WIDTH + gap).toFixed(3));
    }
    return placed;
  }

  /**
   * Second pass: extend existing rows/cols with endcaps / leftover stubs
   * using smaller shelf/storage sizes. Avoid inventing bands in walk aisles.
   */
  function fillLeftoverGaps() {
    if (warehouseMode || !fillRemaining || fillSizes.length === 0) return;
    const before = shelves.length;

    const rowYs = new Set();
    const colXs = new Set();
    for (const s of shelves) {
      if (s.pairRole === "back") continue;
      const rot = ((Number(s.rotationDeg) || 0) % 360 + 360) % 360;
      if (rot === 0 || rot === 180) rowYs.add(Number(Number(s.y).toFixed(3)));
      else colXs.add(Number(Number(s.x).toFixed(3)));
    }
    for (const y of rowYs) fillAlongHorizontalRow(y, minX, maxX, fillSizes);
    for (const x of colXs) fillAlongVerticalCol(x, minY, maxY, fillSizes);

    if (shelves.length > before) {
      for (const s of shelves.slice(before)) {
        if (s.pairRole === "back") continue;
        const fp = shelfFloorFootprint(s);
        scanHorizontalAisles(Number((fp.y - gap - minAisle).toFixed(3)), minX, maxX);
        scanHorizontalAisles(Number((fp.y + fp.d + gap).toFixed(3)), minX, maxX);
        scanVerticalAisles(Number((fp.x - gap - minAisle).toFixed(3)), minY, maxY);
        scanVerticalAisles(Number((fp.x + fp.w + gap).toFixed(3)), minY, maxY);
      }
    }
  }

  /** Count physical gondola units (fronts + unpaired). */
  function countFixtureUnits(list = shelves) {
    let n = 0;
    const seen = new Set();
    for (const s of list) {
      if (s.pairId) {
        if (seen.has(s.pairId)) continue;
        seen.add(s.pairId);
      }
      if (s.pairRole === "back") continue;
      n += 1;
    }
    return n;
  }

  function pocketFillScore(pocketW, pocketH, regionOrient) {
    const runwaySpan = minAisle + gap + depth + gap + minAisle;
    const bayPitch = usable + gap;
    if (regionOrient === "horizontal") {
      const strips = Math.floor((pocketH - margin * 2) / runwaySpan);
      const bays = Math.floor((pocketW - margin * 2) / bayPitch);
      return strips * bays;
    }
    const strips = Math.floor((pocketW - margin * 2) / runwaySpan);
    const bays = Math.floor((pocketH - margin * 2) / bayPitch);
    return strips * bays;
  }

  function pickPocketOrient(pocketX, pocketY, pocketW, pocketH) {
    const hScore = pocketFillScore(pocketW, pocketH, "horizontal");
    const vScore = pocketFillScore(pocketW, pocketH, "vertical");
    if (Math.abs(hScore - vScore) <= 1) {
      const hash = ((Math.floor(pocketX * 47) ^ Math.floor(pocketY * 83)) & 0xff) / 255;
      const jitter = options.mixedRandom !== false ? Math.random() * 0.35 : 0;
      return (hash + jitter) % 1 < 0.5 ? "horizontal" : "vertical";
    }
    return hScore >= vScore ? "horizontal" : "vertical";
  }

  function pocketInsidePolygon(x0, y0, x1, y1) {
    const cx = (x0 + x1) / 2;
    const cy = (y0 + y1) / 2;
    if (pointInPolygon({ x: cx, y: cy }, poly)) return true;
    const w = x1 - x0;
    const h = y1 - y0;
    return rectFullyInsidePolygon(x0, y0, w, h, poly);
  }

  function shelfExtent() {
    let maxSX = minX;
    let maxSY = minY;
    let minSX = maxX;
    let minSY = maxY;
    for (const s of shelves) {
      if (s.pairRole === "back") continue;
      const fp = shelfFloorFootprint(s);
      maxSX = Math.max(maxSX, fp.x + fp.w);
      maxSY = Math.max(maxSY, fp.y + fp.d);
      minSX = Math.min(minSX, fp.x);
      minSY = Math.min(minSY, fp.y);
    }
    return { minSX, minSY, maxSX, maxSY };
  }

  function packMixedEdgeReclaim() {
    if (!shelves.length) return;
    const runwaySpan = minAisle + gap + depth + gap + minAisle;
    const { maxSX, maxSY, minSX, minSY } = shelfExtent();
    const x0 = Number((maxSX + gap).toFixed(3));
    if (maxX - x0 >= runwaySpan * 0.85) packRegion(x0, minY, maxX, maxY, "vertical");
    const y0 = Number((maxSY + gap).toFixed(3));
    if (maxY - y0 >= runwaySpan * 0.85) packRegion(minX, y0, maxX, maxY, "horizontal");
    if (minSX - minX >= runwaySpan * 0.85) {
      packRegion(minX, minY, Number((minSX - gap).toFixed(3)), maxY, "vertical");
    }
    if (minSY - minY >= runwaySpan * 0.85) {
      packRegion(minX, minY, maxX, Number((minSY - gap).toFixed(3)), maxY, "horizontal");
    }
  }

  function packMixedPocketsInBand(x0, y0, x1, y1) {
    const runwaySpan = minAisle + gap + depth + gap + minAisle;
    const pocketH = y1 - y0;
    if (pocketH < runwaySpan * 0.85) return;
    const cellW = Math.max(runwaySpan * 1.45, usable * 2.2 + margin * 2);

    for (let px = x0 + margin; px + runwaySpan * 0.85 <= x1 - margin + 1e-9; px = Number((px + cellW).toFixed(3))) {
      const xEnd = Math.min(x1 - margin, px + cellW);
      const pocketW = xEnd - px;
      if (pocketW < runwaySpan * 0.85) continue;
      if (!pocketInsidePolygon(px, y0, xEnd, y1)) continue;

      const before = countFixtureUnits();
      let orient = pickPocketOrient(px, y0, pocketW, pocketH);
      packRegion(px, y0, xEnd, y1, orient);
      if (countFixtureUnits() === before) {
        orient = orient === "horizontal" ? "vertical" : "horizontal";
        packRegion(px, y0, xEnd, y1, orient);
      }
    }
  }

  /**
   * Mixed / auto — horizontal bands; each band tiles pockets that pick H or V
   * (pseudo-random on ties) so runs vary across the floor. Edge reclaim + endcap fill follow.
   */
  function packMixedPockets() {
    const runwaySpan = minAisle + gap + depth + gap + minAisle;
    const bandH = Math.max(runwaySpan * 2.8, usable * 4 + margin * 2);

    for (let py = minY + margin; py + runwaySpan * 0.85 <= maxY - margin + 1e-9; py = Number((py + bandH).toFixed(3))) {
      const y1 = Math.min(maxY - margin, py + bandH);
      packMixedPocketsInBand(minX, py, maxX, y1);
    }

    packMixedEdgeReclaim();
  }

  if (orient === "mixed" && !warehouseMode) {
    packMixedPockets();
  } else {
    packRegion(minX, minY, maxX, maxY, orient);
  }

  // Claim vacant endcaps / edge strips with smaller shelves or storage.
  fillLeftoverGaps();

  if (options.crossAisles === true && !warehouseMode) {
    fillCrossCorridors(orient === "mixed" ? "mixed" : orient);
  }

  extendAllAislesToPolygon();
  const manualAisles = aisles.filter((a) => a.source === "manual");

  if (warehouseMode) {
    let autoAisles = aisles.filter((a) => a.source !== "manual");
    autoAisles = dedupeOverlappingParallelAisles(autoAisles, layoutForCheck);
    autoAisles = extendWarehouseAislesToFloorSpan(autoAisles, layoutForCheck, { margin });
    autoAisles = pruneOverlappingAisles(autoAisles, layoutForCheck);
    aisles.length = 0;
    aisles.push(...manualAisles, ...autoAisles);
  } else {
    aisles.length = 0;
    aisles.push(...manualAisles);
    const faceCandidates = buildShelfFaceAisles();
    for (const spec of consolidateNearbyAisles(faceCandidates)) {
      pushAisle(spec);
    }
    let workingAisles = dedupeOverlappingParallelAisles(aisles, layoutForCheck);
    aisles.length = 0;
    aisles.push(...workingAisles);
    if (orient !== "mixed") {
      extendAislesToShelfFaces();
    }
    splitAislesClearOfShelves();
    workingAisles = dedupeOverlappingParallelAisles(aisles, layoutForCheck);
    aisles.length = 0;
    aisles.push(...workingAisles);
  }

  const numbered = assignDisplayNumbers(shelves);
  const filteredShelves = [];
  for (const s of numbered) {
    if (!entityInsideLayout(s, "shelf", layoutForCheck)) {
      skippedOutsideCount += 1;
      continue;
    }
    filteredShelves.push(s);
  }
  const { shelves: boundShelves, aisles: boundAisles } = finalizeAisleShelfBinding(
    filteredShelves,
    aisles,
    layoutForCheck
  );
  const finalAisles = [];
  for (const a of boundAisles) {
    if (!entityInsideLayout(a, "aisle", layoutForCheck)) {
      skippedOutsideCount += 1;
      continue;
    }
    finalAisles.push(a);
  }
  let { shelves: finalShelves, aisles: prunedAisles } = finalizeAisleShelfBinding(
    boundShelves,
    finalAisles,
    layoutForCheck
  );
  finalShelves = quantizeFixturePositions(finalShelves);
  finalShelves = syncPairedShelfFootprints(finalShelves);
  finalShelves = dropOverlappingShelfUnits(finalShelves);
  prunedAisles = quantizeAislePositions(prunedAisles);
  const postQuantize = guaranteeEveryShelfHasAisle(finalShelves, prunedAisles, layoutForCheck, {
    preferredMinAisle: minAisle,
    strictMinAisle: warehouseMode || minAisle >= 0.9,
    skipSplit: warehouseMode,
    skipCreate: warehouseMode,
  });
  finalShelves = postQuantize.shelves;
  if (warehouseMode) {
    prunedAisles = enforceAisleMinimums(postQuantize.aisles, finalShelves, layoutForCheck, minAisle, {
      strict: true,
    });
    prunedAisles = pruneOverlappingAisles(prunedAisles, layoutForCheck);
  } else {
    prunedAisles = splitWalkAislesClearOfShelves(postQuantize.aisles, finalShelves, layoutForCheck, {
      minRun: minAisleRun,
    });
    if (orient === "mixed") {
      prunedAisles = pruneCoincidentAisles(prunedAisles, layoutForCheck);
    }
  }
  ({ shelves: finalShelves, aisles: prunedAisles } = finalizeAisleShelfBinding(
    finalShelves,
    prunedAisles,
    layoutForCheck
  ));
  // Final containment pass — merge/widen/split can leave corridors outside the fixture zone.
  prunedAisles = prunedAisles.filter((a) => entityInsideLayout(a, "aisle", layoutForCheck));
  finalShelves = finalShelves.filter((s) => entityInsideLayout(s, "shelf", layoutForCheck));
  ({ shelves: finalShelves, aisles: prunedAisles } = finalizeAisleShelfBinding(
    finalShelves,
    prunedAisles,
    layoutForCheck
  ));
  if (!warehouseMode) {
    const recovered = guaranteeEveryShelfHasAisle(finalShelves, prunedAisles, layoutForCheck, {
      preferredMinAisle: minAisle,
      strictMinAisle: minAisle >= 0.9,
    });
    finalShelves = recovered.shelves;
    prunedAisles = recovered.aisles.filter((a) => entityInsideLayout(a, "aisle", layoutForCheck));
    ({ shelves: finalShelves, aisles: prunedAisles } = finalizeAisleShelfBinding(
      finalShelves,
      prunedAisles,
      layoutForCheck
    ));
    const keepIds = new Set();
    for (const s of finalShelves) {
      if (s.pairRole === "back" || s.pairDisplay) continue;
      if (!s.aisleId) continue;
      keepIds.add(s.id);
      if (s.pairId) {
        for (const other of finalShelves) {
          if (other.pairId === s.pairId) keepIds.add(other.id);
        }
      }
    }
    if (keepIds.size) {
      const dropped = finalShelves.length - keepIds.size;
      if (dropped > 0) skippedOutsideCount += dropped;
      finalShelves = finalShelves.filter((s) => keepIds.has(s.id));
      ({ shelves: finalShelves, aisles: prunedAisles } = finalizeAisleShelfBinding(
        finalShelves,
        prunedAisles,
        layoutForCheck
      ));
    }
  }
  ({ shelves: finalShelves, aisles: prunedAisles } = finalizeAisleLabeling(
    finalShelves,
    prunedAisles,
    layoutForCheck
  ));

  const durationMs = Number((performance.now() - started).toFixed(3));
  console.log(
    JSON.stringify({
      level: "info",
      message: "layout_autogenerate",
      layoutId: layout?.id,
      aisleCount: aisles.length,
      shelfCount: numbered.length,
      skippedOutsideCount,
      orientation: orient,
      durationMs,
    })
  );
  return {
    aisles: prunedAisles,
    shelves: finalShelves,
    aisleCount: prunedAisles.length,
    shelfCount: finalShelves.length,
    gondolaUnits: countGondolaUnits(finalShelves),
    walkAisles: prunedAisles.length,
    durationMs,
    orientation: orient,
    droppedOutsidePolygon: 0,
    skippedOutsideCount,
  };
}
