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
  layoutBoundaryPolygon,
  rectFullyInsidePolygon,
} from "./polygonContainment.js";
import { assignDisplayNumbers, isDoubleSidedType } from "./shelfFaces.js";

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
  const margin = 0.25;
  const minAisleRun = Math.max(1.0, usable);

  const xs = poly.map((p) => p.x);
  const ys = poly.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const bw = maxX - minX;
  const bd = maxY - minY;

  const orient = resolveOrientation(options.orientation || "auto", bw, bd);

  const shelves = [];
  const aisles = [];
  let skippedOutsideCount = 0;
  let aisleSeq = 0;

  function makeShelf(x, y, rotationDeg, widthM, depthM) {
    const doubleSided = isDoubleSidedType(shelfType);
    return {
      id: `shf-${randomUUID().slice(0, 6)}`,
      type: shelfType,
      label: "Shelf",
      usableWidthMeters: usable,
      widthMeters: widthM,
      depthMeters: depthM,
      heightMeters: height,
      x,
      y,
      rotationDeg,
      aisleId: null,
      categoryId: null,
      color: undefined,
      doubleSided,
      faces: doubleSided
        ? [
            { id: "A", categoryId: null, planogram: [] },
            { id: "B", categoryId: null, planogram: [] },
          ]
        : [{ id: "A", categoryId: null, planogram: [] }],
      levels: levelsForType(shelfType, height, defaultLevels),
      planogram: [],
    };
  }

  function pushAisle(a) {
    aisles.push({
      id: `aisle-${randomUUID().slice(0, 6)}`,
      name: `Aisle ${++aisleSeq}`,
      path: [],
      categoryId: null,
      color: undefined,
      violations: [],
      ...a,
    });
  }

  /** Pack shelves + interleaved aisles inside a sub-rectangle (still clipped to polygon). */
  function packRegion(x0, y0, x1, y1, regionOrient) {
    if (x1 - x0 < usable || y1 - y0 < depth) return;
    if (regionOrient === "horizontal") {
      let y = y0 + margin;
      while (y + depth <= y1 - margin + 1e-9) {
        let x = x0 + margin;
        while (x + usable <= x1 - margin + 1e-9) {
          if (rectFullyInsidePolygon(x, y, usable, depth, poly)) {
            shelves.push(makeShelf(x, y, 0, usable, depth));
          } else {
            skippedOutsideCount += 1;
          }
          x = Number((x + usable + gap).toFixed(3));
        }
        y = Number((y + depth + gap).toFixed(3));
        if (y + minAisle > y1 - margin) break;
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
        y = Number((y + minAisle + gap).toFixed(3));
      }
    } else {
      let x = x0 + margin;
      while (x + depth <= x1 - margin + 1e-9) {
        let y = y0 + margin;
        while (y + usable <= y1 - margin + 1e-9) {
          if (rectFullyInsidePolygon(x, y, depth, usable, poly)) {
            shelves.push(makeShelf(x, y, 90, depth, usable));
          } else {
            skippedOutsideCount += 1;
          }
          y = Number((y + usable + gap).toFixed(3));
        }
        x = Number((x + depth + gap).toFixed(3));
        if (x + minAisle > x1 - margin) break;
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
        x = Number((x + minAisle + gap).toFixed(3));
      }
    }
  }

  if (orient === "mixed") {
    // Split along the longer axis: one zone vertical runs, the other horizontal,
    // with a wide corridor between them. Produces both shelf orientations + aisles.
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
  } else {
    packRegion(minX, minY, maxX, maxY, orient);
  }

  const numbered = assignDisplayNumbers(shelves);

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
    aisles,
    shelves: numbered,
    aisleCount: aisles.length,
    shelfCount: numbered.length,
    durationMs,
    orientation: orient,
    droppedOutsidePolygon: 0,
    skippedOutsideCount,
  };
}
