/**
 * Storage volume math.
 *
 * "Available storage volume" is the space a shelf can actually merchandise:
 *   usable width  ×  usable depth per face  ×  clear height between levels
 *
 * Two corrections vs. plain W×D×H:
 *  - Shelf boards consume height, so each level's clear height is the gap to the
 *    level above (or to the top of the unit), less the board thickness.
 *  - A two-sided unit (gondola pair or double-sided shelf) is merchandised from
 *    both sides, so each face owns half the physical depth. Counting full depth
 *    on both faces would double-book the same cubic metres.
 */
import { productDimensions } from "./planogramMath.js";
import {
  faceDepthMeters,
  levelClearHeights,
  merchandisingFaces,
  shelfUsableWidthMeters,
} from "./shelfGeometry.js";

export {
  BOARD_THICKNESS_M,
  faceDepthMeters,
  isTwoSided,
  levelClearHeights,
  merchandisingFaces,
  shelfLevelList,
  shelfUsableWidthMeters,
} from "./shelfGeometry.js";

/** Available volume (m³) of a single face, summed over its levels. */
export function faceStorageVolumeM3(shelf) {
  const width = shelfUsableWidthMeters(shelf);
  const depth = faceDepthMeters(shelf);
  if (width <= 0 || depth <= 0) return 0;
  return levelClearHeights(shelf).reduce((sum, lv) => sum + width * depth * lv.clearHeightMeters, 0);
}

/** Available volume (m³) of one shelf record across its merchandised faces. */
export function shelfStorageVolumeM3(shelf) {
  return faceStorageVolumeM3(shelf) * merchandisingFaces(shelf).length;
}

/** Available volume (m³) of a single level on a single face. */
export function levelStorageVolumeM3(shelf, levelIndex) {
  const width = shelfUsableWidthMeters(shelf);
  const depth = faceDepthMeters(shelf);
  if (width <= 0 || depth <= 0) return 0;
  const lv = levelClearHeights(shelf).find((l) => l.levelIndex === Number(levelIndex));
  if (!lv) return 0;
  return width * depth * lv.clearHeightMeters;
}

export function productVolumeM3(product) {
  const dims = productDimensions(product);
  return (
    (Number(dims.widthMeters) || 0) *
    (Number(dims.heightMeters) || 0) *
    (Number(dims.depthMeters) || 0)
  );
}

/** Volume consumed by one placement: unit volume × wide facings × deep facings. */
export function placementVolumeM3(placement, product) {
  const facings = Math.max(1, Math.round(Number(placement?.facings) || 1));
  const depthFacings = Math.max(1, Math.round(Number(placement?.depthFacings) || 1));
  const stackLayers = Math.max(1, Math.round(Number(placement?.stackLayers) || 1));
  return productVolumeM3(product) * facings * depthFacings * stackLayers;
}

function productIndex(products) {
  const map = new Map();
  for (const p of products || []) map.set(p.id, p);
  return map;
}

/** Every face carrying data, used when tallying what is placed (not capacity). */
function allFaces(shelf) {
  if (shelf?.faces?.length) return shelf.faces;
  return [{ id: "A", categoryId: shelf?.categoryId || null, planogram: shelf?.planogram || [] }];
}

/** Volume (m³) actually occupied by placements on one shelf record. */
export function shelfUsedVolumeM3(shelf, productsById) {
  let used = 0;
  for (const face of allFaces(shelf)) {
    for (const placement of face.planogram || []) {
      const product = productsById.get(placement.productId);
      if (!product) continue;
      used += placementVolumeM3(placement, product);
    }
  }
  return used;
}

/**
 * Store-wide storage volume: available vs occupied, overall and per level.
 */
export function computeStorageVolume(layout, products) {
  const byId = productIndex(products);
  const shelves = layout?.shelves?.length ? layout.shelves : layout?.fixtures || [];

  let availableM3 = 0;
  let usedM3 = 0;
  const byLevel = new Map();

  for (const shelf of shelves) {
    const faces = merchandisingFaces(shelf);
    const heights = levelClearHeights(shelf);
    const width = shelfUsableWidthMeters(shelf);
    const depth = faceDepthMeters(shelf);

    for (const face of faces) {
      for (const lv of heights) {
        const levelVolume = width * depth * lv.clearHeightMeters;
        availableM3 += levelVolume;

        let levelUsed = 0;
        for (const placement of face.planogram || []) {
          if (Number(placement.levelIndex) !== lv.levelIndex) continue;
          const product = byId.get(placement.productId);
          if (!product) continue;
          levelUsed += placementVolumeM3(placement, product);
        }
        usedM3 += levelUsed;

        const prev = byLevel.get(lv.levelIndex) || {
          levelIndex: lv.levelIndex,
          availableM3: 0,
          usedM3: 0,
        };
        prev.availableM3 += levelVolume;
        prev.usedM3 += levelUsed;
        byLevel.set(lv.levelIndex, prev);
      }
    }
  }

  const levels = [...byLevel.values()]
    .sort((a, b) => a.levelIndex - b.levelIndex)
    .map((row) => ({
      levelIndex: row.levelIndex,
      levelLabel:
        row.levelIndex === 0 ? "Bottom" : row.levelIndex === 1 ? "Eye-level" : `Level ${row.levelIndex}`,
      availableVolumeM3: Number(row.availableM3.toFixed(3)),
      usedVolumeM3: Number(row.usedM3.toFixed(3)),
      fillPercent: row.availableM3 > 0 ? Number(((row.usedM3 / row.availableM3) * 100).toFixed(1)) : 0,
    }));

  return {
    availableVolumeM3: Number(availableM3.toFixed(3)),
    usedVolumeM3: Number(usedM3.toFixed(3)),
    freeVolumeM3: Number(Math.max(0, availableM3 - usedM3).toFixed(3)),
    fillPercent: availableM3 > 0 ? Number(((usedM3 / availableM3) * 100).toFixed(1)) : 0,
    levels,
  };
}

/**
 * Category allocation by storage volume.
 *
 * Each face is attributed wholly to its own category, so a gondola merchandising
 * two categories splits by actual face volume rather than an even 50/50 guess.
 */
export function computeCategoryVolumeAllocation(layout, categories, products, resolveCategory) {
  const byId = productIndex(products);
  const shelves = layout?.shelves?.length ? layout.shelves : layout?.fixtures || [];
  const byCat = new Map();
  let totalAvailable = 0;
  let totalUsed = 0;

  for (const shelf of shelves) {
    const faceVolume = faceStorageVolumeM3(shelf);
    for (const face of merchandisingFaces(shelf)) {
      const rawCatId = face.categoryId || shelf.categoryId;
      if (!rawCatId) continue;

      const resolved = resolveCategory ? resolveCategory(rawCatId) : rawCatId;
      const key = resolved || rawCatId;
      const cat = (categories || []).find((c) => c.id === key);

      let used = 0;
      for (const placement of face.planogram || []) {
        const product = byId.get(placement.productId);
        if (!product) continue;
        used += placementVolumeM3(placement, product);
      }

      const prev = byCat.get(key) || {
        categoryId: key,
        categoryName: cat?.name || rawCatId,
        color: cat?.color || face.color || shelf.color || "#A30A2A",
        availableVolumeM3: 0,
        usedVolumeM3: 0,
        faceCount: 0,
      };
      prev.availableVolumeM3 += faceVolume;
      prev.usedVolumeM3 += used;
      prev.faceCount += 1;
      byCat.set(key, prev);

      totalAvailable += faceVolume;
      totalUsed += used;
    }
  }

  const rows = [...byCat.values()]
    .map((row) => ({
      ...row,
      availableVolumeM3: Number(row.availableVolumeM3.toFixed(3)),
      usedVolumeM3: Number(row.usedVolumeM3.toFixed(3)),
      volumeSharePercent:
        totalAvailable > 0 ? Number(((row.availableVolumeM3 / totalAvailable) * 100).toFixed(1)) : 0,
      fillPercent:
        row.availableVolumeM3 > 0 ? Number(((row.usedVolumeM3 / row.availableVolumeM3) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.availableVolumeM3 - a.availableVolumeM3);

  return {
    rows,
    totalAvailableVolumeM3: Number(totalAvailable.toFixed(3)),
    totalUsedVolumeM3: Number(totalUsed.toFixed(3)),
  };
}
