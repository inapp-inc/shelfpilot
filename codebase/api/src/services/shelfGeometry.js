/**
 * Physical shelf geometry shared by facing, volume, and weight math.
 * Kept dependency-free so those modules can all import it without cycles.
 */

/** Shelf board/deck thickness removed from each level's clear height. */
export const BOARD_THICKNESS_M = 0.03;

/** Vertical gap reserved between stacked product layers (matches 3D render). */
export const STACK_LAYER_GAP_M = 0.008;

/** Floor of clear height per level so degenerate data never yields zero volume. */
const MIN_CLEAR_HEIGHT_M = 0.05;

export function shelfLevelList(shelf) {
  const levels = Array.isArray(shelf?.levels) && shelf.levels.length ? shelf.levels : null;
  if (levels) {
    return [...levels]
      .map((lv, i) => ({ ...lv, levelIndex: Number(lv.levelIndex ?? i) || 0 }))
      .sort((a, b) => a.levelIndex - b.levelIndex);
  }
  const n = Math.max(1, Number(shelf?.defaultLevels) || 2);
  return Array.from({ length: n }, (_, i) => ({ levelIndex: i }));
}

/**
 * Faces that actually hold merchandise.
 *
 * Every shelf is created with `doubleSided: true`, so face count alone does not
 * mean the unit is shopped from both sides — only an assigned category does. An
 * unmapped shelf still reports one face so it contributes its capacity.
 */
export function merchandisingFaces(shelf) {
  const faces = Array.isArray(shelf?.faces) && shelf.faces.length ? shelf.faces : null;
  if (!faces) {
    return [{ id: "A", categoryId: shelf?.categoryId || null, planogram: shelf?.planogram || [] }];
  }
  const mapped = faces.filter((f) => f.categoryId);
  return mapped.length ? mapped : [faces[0]];
}

/** True when the unit is shopped from both sides (gondola pair, or both faces mapped). */
export function isTwoSided(shelf) {
  if (shelf?.pairId || shelf?.pairRole === "front" || shelf?.pairRole === "back") return true;
  return merchandisingFaces(shelf).length > 1;
}

/**
 * Depth one face can merchandise. A unit shopped from both sides splits its
 * physical depth between them — counting the full depth on both faces would book
 * the same cubic metres twice. A gondola pair is two shelf records sharing one
 * footprint, so each record is already one face of the split.
 */
export function faceDepthMeters(shelf) {
  const depth = Number(shelf?.depthMeters) || 0;
  if (depth <= 0) return 0;
  return isTwoSided(shelf) ? depth / 2 : depth;
}

export function shelfUsableWidthMeters(shelf) {
  return Number(shelf?.usableWidthMeters ?? shelf?.widthMeters) || 0;
}

/**
 * Clear height available on each level: the gap up to the next level (or the top
 * of the unit) minus the shelf board.
 */
export function levelClearHeights(shelf) {
  const shelfHeight = Number(shelf?.heightMeters) || 2;
  const levels = shelfLevelList(shelf);
  const count = levels.length || 1;

  return levels.map((lv, i) => {
    const base = Number(lv.heightFromFloorMeters);
    const nextBase = i + 1 < levels.length ? Number(levels[i + 1].heightFromFloorMeters) : null;

    let gap;
    if (Number.isFinite(base) && Number.isFinite(nextBase)) {
      gap = nextBase - base;
    } else if (Number.isFinite(base)) {
      gap = shelfHeight - base;
    } else {
      gap = shelfHeight / count;
    }
    gap -= BOARD_THICKNESS_M;

    if (!Number.isFinite(gap) || gap <= 0) {
      const clearance = Number(lv.clearanceMeters);
      gap = Number.isFinite(clearance) && clearance > 0 ? clearance : shelfHeight / (count + 1);
    }

    let clearM = Math.max(MIN_CLEAR_HEIGHT_M, gap);
    const clearanceCap = Number(lv.clearanceMeters);
    if (Number.isFinite(clearanceCap) && clearanceCap > 0) {
      clearM = Math.min(clearM, clearanceCap);
    }

    return {
      levelIndex: Number(lv.levelIndex) || 0,
      clearHeightMeters: Number(clearM.toFixed(3)),
    };
  });
}

export function levelClearHeightMeters(shelf, levelIndex) {
  const row = levelClearHeights(shelf).find((l) => l.levelIndex === Number(levelIndex));
  return row ? row.clearHeightMeters : 0;
}
