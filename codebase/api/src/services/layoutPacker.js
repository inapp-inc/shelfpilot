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
  entityInsideLayout,
  layoutBoundaryPolygon,
  maxLengthInsideX,
  maxLengthInsideY,
  pointInPolygon,
  rectFullyInsidePolygon,
  shelfFloorFootprint,
  shelfInsidePolygon,
  overlapsAnyShelf,
} from "./polygonContainment.js";
import { assignDisplayNumbers, countGondolaUnits, oppositeShelfOrigin } from "./shelfFaces.js";
import { finalizeAisleShelfBinding, shelfCenter } from "./aisleBinding.js";
import {
  finalizeAisleLabeling,
  quantizeAislePositions,
  quantizeFixturePositions,
} from "./aisleLabeling.js";

export function levelsForType(type, heightMeters, defaultLevels) {
  const h = Number(heightMeters) || 2;
  const count = Math.max(1, Number(defaultLevels) || ({ shelf: 2, gondola: 3, rack: 4, storage: 2 }[type] || 2));
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
  // auto: pick the run direction along the longer axis
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
  const poly = layoutBoundaryPolygon(layout);
  const WALKABLE_MIN = 0.9;
  const minAisle = Math.max(WALKABLE_MIN, Number(options.minAisleWidthMeters) || 1.2);
  const tmpl = options.shelfTemplate || {};
  const usable = Number(tmpl.usableWidthMeters) || 1.2;
  const depth = Number(tmpl.depthMeters) || 0.6;
  const height = Number(tmpl.heightMeters) || 2;
  const shelfType = tmpl.type || "shelf";
  const defaultLevels = tmpl.defaultLevels;
  const gap = 0.1;
  const compactMode = options.compactMode !== false;
  const margin = compactMode ? 0.15 : 0.25;
  const minAisleRun = Math.max(0.8, minAisle);

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

  function makeShelf(x, y, rotationDeg, widthM, depthM, pairMeta = null) {
    const rot = ((Number(rotationDeg) || 0) % 360 + 360) % 360;
    const paired = Boolean(pairMeta?.pairId);
    return {
      id: `shf-${randomUUID().slice(0, 6)}`,
      type: shelfType,
      label: pairMeta?.pairRole === "back" ? "Shelf (back)" : pairMeta?.pairRole === "front" ? "Shelf (front)" : "Shelf",
      usableWidthMeters: usable,
      widthMeters: widthM,
      depthMeters: depthM,
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
      levels: levelsForType(shelfType, height, defaultLevels),
      planogram: [],
    };
  }

  /** Two physical shelves sharing one footprint: front + back facing opposite aisles. */
  function makeShelfPair(x, y, rotationDeg, widthM, depthM, meta = {}) {
    const pairId = `pair-${randomUUID().slice(0, 8)}`;
    const front = makeShelf(x, y, rotationDeg, widthM, depthM, { pairId, pairRole: "front" });
    const backOrigin = oppositeShelfOrigin(x, y, rotationDeg, widthM, depthM);
    const back = makeShelf(backOrigin.x, backOrigin.y, backOrigin.rotationDeg, widthM, depthM, {
      pairId,
      pairRole: "back",
    });
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
    return overlap > 0 && minLen > 0 && overlap / minLen > 0.8;
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
    if (overlapsAnyShelf(candidate, { ...layoutForCheck, shelves })) {
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

  function placeGondolaRowHorizontal(gondolaY, x0, x1) {
    let pairsPlaced = 0;
    let x = x0 + margin;
    while (x + usable <= x1 - margin + 1e-9) {
      if (shelfFitsAt(x, gondolaY, 0, usable, depth)) {
        shelves.push(...makeShelfPair(x, gondolaY, 0, usable, depth));
        pairsPlaced += 1;
      } else {
        skippedOutsideCount += 1;
      }
      x = Number((x + usable + gap).toFixed(3));
    }
    return pairsPlaced;
  }

  function placeGondolaRowVertical(gondolaX, y0, y1) {
    let pairsPlaced = 0;
    let y = y0 + margin;
    while (y + usable <= y1 - margin + 1e-9) {
      if (shelfFitsAt(gondolaX, y, 90, usable, depth)) {
        shelves.push(...makeShelfPair(gondolaX, y, 90, usable, depth));
        pairsPlaced += 1;
      } else {
        skippedOutsideCount += 1;
      }
      y = Number((y + usable + gap).toFixed(3));
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

  /** Compact strip: gondola pairs with walk aisles between bands. */
  function packCompactStripHorizontal(yStart, x0, x1, y1) {
    let y = yStart + margin + minAisle + gap;
    let any = false;
    while (y + depth <= y1 - margin + 1e-9) {
      scanHorizontalAisles(Number((y - gap - minAisle).toFixed(3)), x0, x1);
      const placed = placeGondolaRowHorizontal(y, x0, x1);
      if (placed === 0) break;
      any = true;
      const southY = Number((y + depth + gap).toFixed(3));
      scanHorizontalAisles(southY, x0, x1);
      y = Number((southY + minAisle).toFixed(3));
    }
    return any;
  }

  function packCompactStripVertical(xStart, y0, y1, x1) {
    let x = xStart + margin + minAisle + gap;
    let any = false;
    while (x + depth <= x1 - margin + 1e-9) {
      scanVerticalAisles(Number((x - gap - minAisle).toFixed(3)), y0, y1);
      const placed = placeGondolaRowVertical(x, y0, y1);
      if (placed === 0) break;
      any = true;
      const eastX = Number((x + depth + gap).toFixed(3));
      scanVerticalAisles(eastX, y0, y1);
      x = Number((eastX + minAisle).toFixed(3));
    }
    return any;
  }

  function extendAllAislesToPolygon() {
    for (const a of aisles) {
      if (a.orientation === "vertical") {
        const trimmed = maxLengthInsideY(a.x, a.y, a.widthMeters, maxY - minY, poly);
        if (trimmed >= minAisleRun) a.lengthMeters = trimmed;
      } else {
        const trimmed = maxLengthInsideX(a.x, a.y, maxX - minX, a.widthMeters, poly);
        if (trimmed >= minAisleRun) a.lengthMeters = trimmed;
      }
    }
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

  /** Pack runway strips inside a sub-rectangle (clipped to polygon). */
  function packRegion(x0, y0, x1, y1, regionOrient) {
    if (x1 - x0 < usable || y1 - y0 < depth) return;
    const runwaySpan = minAisle + gap + depth + gap + minAisle;
    const compactMin = depth + 2 * margin;

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
        } else if (remaining >= compactMin && compactMode) {
          packCompactStripHorizontal(yNorth, x0, x1, y1);
          placedAny = true;
          break;
        } else {
          break;
        }
      }
      if (!placedAny && y1 - y0 >= compactMin && compactMode) {
        packCompactStripHorizontal(y0, x0, x1, y1);
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
        } else if (remaining >= compactMin && compactMode) {
          packCompactStripVertical(xWest, y0, y1, x1);
          placedAny = true;
          break;
        } else {
          break;
        }
      }
      if (!placedAny && x1 - x0 >= compactMin && compactMode) {
        packCompactStripVertical(x0, y0, y1, x1);
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

  function footprintsOverlap(a, b) {
    return !(
      a.x + a.w <= b.x + 1e-6 ||
      b.x + b.w <= a.x + 1e-6 ||
      a.y + a.d <= b.y + 1e-6 ||
      b.y + b.d <= a.y + 1e-6
    );
  }

  function overlapsExistingShelf(tentative) {
    const fp = shelfFloorFootprint(tentative);
    for (const s of shelves) {
      if (footprintsOverlap(fp, shelfFloorFootprint(s))) return true;
    }
    return false;
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

  function shelfFitsAt(x, y, rotationDeg, widthM, depthM) {
    const t = tentativeShelf(x, y, rotationDeg, widthM, depthM);
    if (!shelfInsidePolygon(t, poly)) return false;
    if (overlapsExistingShelf(t)) return false;
    if (blocksEntryClearance(t)) return false;
    return true;
  }

  /** Mixed fill on irregular polygons: orientation follows each sub-cell aspect ratio. */
  function packMixedIrregularGrid() {
    const cols = Math.max(2, Math.round(bw / Math.max(usable * 3, 4)));
    const rows = Math.max(2, Math.round(bd / Math.max(usable * 3, 4)));
    const cw = bw / cols;
    const ch = bd / rows;
    for (let ri = 0; ri < rows; ri += 1) {
      for (let ci = 0; ci < cols; ci += 1) {
        const x0 = minX + ci * cw;
        const y0 = minY + ri * ch;
        const x1 = ci === cols - 1 ? maxX : minX + (ci + 1) * cw;
        const y1 = ri === rows - 1 ? maxY : minY + (ri + 1) * ch;
        const cx = (x0 + x1) / 2;
        const cy = (y0 + y1) / 2;
        if (!pointInPolygon({ x: cx, y: cy }, poly)) continue;
        const rw = x1 - x0;
        const rh = y1 - y0;
        if (rw < usable || rh < depth + minAisle) continue;
        const regionOrient = rh > rw * 1.08 ? "vertical" : "horizontal";
        packRegion(x0, y0, x1, y1, regionOrient);
      }
    }
  }

  if (orient === "mixed") {
    const polyArea = polygonAreaMeters(poly);
    const bboxArea = Math.max(0.01, bw * bd);
    const irregular = poly.length > 4 || polyArea / bboxArea < 0.92;

    if (irregular) {
      // Irregular / L-shaped floors: aspect-ratio cells pick horizontal vs vertical runs.
      packMixedIrregularGrid();
    } else {
      // Regular rectangles: two orientation zones + one main divider corridor.
      const half = minAisle / 2 + gap;
      if (bw >= bd) {
        const splitX = minX + bw / 2;
        packRegion(minX, minY, splitX - half, maxY, "vertical");
        packRegion(splitX + half, minY, maxX, maxY, "horizontal");
        const dividerX = splitX - minAisle / 2;
        for (const run of insideRunsAlongY(dividerX, minAisle, minY + margin, maxY - margin, poly)) {
          if (run.len >= minAisleRun) {
            pushAisle({
              orientation: "vertical",
              x: dividerX,
              y: run.y,
              widthMeters: minAisle,
              lengthMeters: Number(run.len.toFixed(2)),
            });
          }
        }
      } else {
        const splitY = minY + bd / 2;
        packRegion(minX, minY, maxX, splitY - half, "horizontal");
        packRegion(minX, splitY + half, maxX, maxY, "vertical");
        const dividerY = splitY - minAisle / 2;
        for (const run of insideRunsAlongX(dividerY, minAisle, minX + margin, maxX - margin, poly)) {
          if (run.len >= minAisleRun) {
            pushAisle({
              orientation: "horizontal",
              x: run.x,
              y: dividerY,
              widthMeters: minAisle,
              lengthMeters: Number(run.len.toFixed(2)),
            });
          }
        }
      }
    }
  } else {
    packRegion(minX, minY, maxX, maxY, orient);
  }

  if (options.crossAisles === true) {
    fillCrossCorridors(orient === "mixed" ? "mixed" : orient);
  }

  extendAllAislesToPolygon();
  ensureWalkAislesFromShelves();

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
    if (overlapsAnyShelf(a, { ...layoutForCheck, shelves: boundShelves })) {
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
  prunedAisles = quantizeAislePositions(prunedAisles);
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
