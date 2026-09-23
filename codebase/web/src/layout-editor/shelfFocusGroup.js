/**
 * FR-VIEW-02 / SEED-CB-07 — three-shelf 3D focus window along an aisle.
 */
import { shelvesOnAisle } from "./aisleShelfView.js";

export const SHELF_3D_GROUP_SIZE = 3;

/** Enabled unless explicitly disabled in the build env. */
export const SHELF_3D_GROUP_FOCUS =
  typeof import.meta !== "undefined" && import.meta.env?.VITE_SHELF_3D_GROUP_FOCUS === "0"
    ? false
    : true;

function shelfCenter2d(shelf) {
  const w = Number(shelf?.widthMeters) || 1;
  const d = Number(shelf?.depthMeters) || 0.6;
  return {
    x: (Number(shelf?.x) || 0) + w / 2,
    y: (Number(shelf?.y) || 0) + d / 2,
  };
}

function normalizedRotationDeg(shelf) {
  return ((Number(shelf?.rotationDeg) || 0) % 360 + 360) % 360;
}

function rotationDelta(a, b) {
  const delta = Math.abs(normalizedRotationDeg(a) - normalizedRotationDeg(b)) % 360;
  return delta > 180 ? 360 - delta : delta;
}

/** Position along the shelf run (local width axis). */
function runAxisProjection(shelf) {
  const center = shelfCenter2d(shelf);
  const rot = (normalizedRotationDeg(shelf) * Math.PI) / 180;
  return center.x * Math.cos(rot) + center.y * Math.sin(rot);
}

/** Perpendicular distance between two shelves on the same run. */
function lateralAxisDistance(a, b) {
  const ca = shelfCenter2d(a);
  const cb = shelfCenter2d(b);
  const rot = (normalizedRotationDeg(a) * Math.PI) / 180;
  const dx = cb.x - ca.x;
  const dy = cb.y - ca.y;
  return Math.abs(-dx * Math.sin(rot) + dy * Math.cos(rot));
}

function sliceWindow(ids, idx, windowSize) {
  const size = Math.max(1, Math.floor(Number(windowSize) || SHELF_3D_GROUP_SIZE));
  const half = Math.floor(size / 2);
  let start = Math.max(0, idx - half);
  let end = Math.min(ids.length, start + size);
  start = Math.max(0, end - size);
  return ids.slice(start, end);
}

/**
 * Shelves sharing the target's physical run: same facing (within 14°) and close enough
 * laterally to sit on the same gondola line, ordered by position along that run.
 *
 * The rotation filter also drops the target's own back half (front/back of a gondola differ by
 * 180°) — that matters because the two halves render as ONE unit, so keeping both would waste a
 * slot in the window and yield only two visible units.
 */
function colinearRun(shelves, target) {
  const maxLateral = Math.max(Number(target.depthMeters) || 0.6, 0.5) * 1.85;
  return shelves
    .filter(
      (s) =>
        s.id === target.id ||
        (rotationDelta(s, target) < 14 && lateralAxisDistance(s, target) < maxLateral)
    )
    .sort((a, b) => runAxisProjection(a) - runAxisProjection(b));
}

/** Fallback when aisle binding is missing — colinear shelves along the same fixture run. */
export function spatialFocusGroupFor(layout, targetShelfId, windowSize = SHELF_3D_GROUP_SIZE) {
  const shelves = (layout?.shelves || layout?.fixtures || []).filter((s) => s && !s.pairDisplay);
  const target = shelves.find((s) => s.id === targetShelfId);
  if (!target) return [targetShelfId];

  const row = colinearRun(shelves, target);
  const idx = row.findIndex((s) => s.id === targetShelfId);
  if (idx < 0) return [targetShelfId];
  return sliceWindow(
    row.map((s) => s.id),
    idx,
    windowSize
  );
}

/**
 * @returns {{ targetShelfId: string|null, physicalShelfIds: string[] }}
 */
export function focusGroupFor(layout, targetShelfId, windowSize = SHELF_3D_GROUP_SIZE) {
  if (!layout || !targetShelfId) {
    return { targetShelfId: targetShelfId || null, physicalShelfIds: [] };
  }

  const shelves = (layout.shelves || layout.fixtures || []).filter((s) => s && !s.pairDisplay);
  const target = shelves.find((s) => s.id === targetShelfId);
  if (!target) {
    return { targetShelfId, physicalShelfIds: [targetShelfId] };
  }
  if (!target.aisleId) {
    return {
      targetShelfId,
      physicalShelfIds: spatialFocusGroupFor(layout, targetShelfId, windowSize),
    };
  }

  // Candidates come from the aisle binding (project.md §9: aisle binding owns shelf identity),
  // but the window must be ordered by real position along the run — NOT by shelfIndexAlongAisle.
  // One aisle routinely binds both halves of every gondola plus more than one gondola column, so
  // consecutive indices are not neighbours: on a generated vertical layout, indices 0/1/2 were
  // the target, the target's own back half (same rendered unit), and a gondola in the next column
  // 2.5m to the side — a "three-shelf" window that drew two units, one of them across the way.
  const aisleShelves = colinearRun(shelvesOnAisle(layout, target.aisleId), target);
  const idx = aisleShelves.findIndex((s) => s.id === targetShelfId);
  if (idx < 0) {
    return {
      targetShelfId,
      physicalShelfIds: spatialFocusGroupFor(layout, targetShelfId, windowSize),
    };
  }

  const aisleIds = aisleShelves.map((s) => s.id);
  let physicalShelfIds = sliceWindow(aisleIds, idx, windowSize);
  if (physicalShelfIds.length < windowSize) {
    const spatialIds = spatialFocusGroupFor(layout, targetShelfId, windowSize);
    if (spatialIds.length > physicalShelfIds.length) {
      physicalShelfIds = spatialIds;
    }
  }

  return {
    targetShelfId,
    physicalShelfIds,
  };
}

export function shelfUnitContainsPhysicalId(unit, physicalShelfId) {
  if (!unit || !physicalShelfId) return false;
  return (
    unit.id === physicalShelfId ||
    unit.pairShelfIds?.front === physicalShelfId ||
    unit.pairShelfIds?.back === physicalShelfId
  );
}

export function shelfUnitInFocusGroup(unit, physicalShelfIds = []) {
  if (!unit || !physicalShelfIds?.length) return false;
  return physicalShelfIds.some((id) => shelfUnitContainsPhysicalId(unit, id));
}
