/**
 * Shelf load / weight capacity math.
 *
 * Products carry a unit weight; fixtures carry a safe working load per level and
 * for the whole unit. Inventory counts (facings × depth facings) are converted to
 * a load so a planogram that fits dimensionally but overloads the deck is caught.
 *
 * All weights are kilograms internally; the UI converts for display.
 */
import { shelfLevelList } from "./shelfGeometry.js";

export const KG_PER_LB = 0.45359237;

/** Safe working load per level (kg) when a fixture does not define its own. */
export const DEFAULT_LEVEL_LOAD_KG = {
  shelf: 80,
  gondola: 100,
  rack: 150,
  storage: 300,
  pallet: 500,
  freezer: 120,
  chiller: 120,
};

export const FALLBACK_LEVEL_LOAD_KG = 80;

export function productWeightKg(product) {
  const attrs = product?.attributes || {};
  const direct = Number(attrs.weightKg ?? product?.weightKg);
  if (Number.isFinite(direct) && direct > 0) return direct;

  const grams = Number(attrs.weightGrams ?? product?.weightGrams);
  if (Number.isFinite(grams) && grams > 0) return grams / 1000;

  const lb = Number(attrs.weightLb ?? product?.weightLb);
  if (Number.isFinite(lb) && lb > 0) return lb * KG_PER_LB;

  return 0;
}

export function hasProductWeight(product) {
  return productWeightKg(product) > 0;
}

/** Safe working load for one level of a shelf (kg). */
export function levelLoadLimitKg(shelf) {
  const explicit = Number(shelf?.maxLoadKgPerLevel);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;

  const total = Number(shelf?.maxLoadKg);
  if (Number.isFinite(total) && total > 0) {
    return total / Math.max(1, shelfLevelList(shelf).length);
  }

  return DEFAULT_LEVEL_LOAD_KG[shelf?.type] ?? FALLBACK_LEVEL_LOAD_KG;
}

/** Safe working load for the whole unit (kg). */
export function shelfLoadLimitKg(shelf) {
  const explicit = Number(shelf?.maxLoadKg);
  if (Number.isFinite(explicit) && explicit > 0) return explicit;
  return levelLoadLimitKg(shelf) * Math.max(1, shelfLevelList(shelf).length);
}

/** Load contributed by one placement: unit weight × wide facings × deep facings. */
export function placementWeightKg(placement, product) {
  const facings = Math.max(1, Math.round(Number(placement?.facings) || 1));
  const depthFacings = Math.max(1, Math.round(Number(placement?.depthFacings) || 1));
  const stackLayers = Math.max(1, Math.round(Number(placement?.stackLayers) || 1));
  return productWeightKg(product) * facings * depthFacings * stackLayers;
}

/**
 * How many units of a given weight still fit under a limit.
 * Returns Infinity when the product has no weight on file, so weight never
 * silently reduces capacity for an incomplete catalog.
 */
export function unitsWithinLoad(limitKg, currentKg, unitWeightKg) {
  if (!Number.isFinite(unitWeightKg) || unitWeightKg <= 0) return Infinity;
  const headroom = limitKg - currentKg;
  if (headroom <= 0) return 0;
  return Math.floor(headroom / unitWeightKg + 1e-9);
}

function productIndex(products) {
  const map = new Map();
  for (const p of products || []) map.set(p.id, p);
  return map;
}

function shelfFaces(shelf) {
  if (shelf?.faces?.length) return shelf.faces;
  return [{ id: "A", categoryId: shelf?.categoryId || null, planogram: shelf?.planogram || [] }];
}

/**
 * Per-level and total load for one shelf.
 * A level with no weighed products reports `weighed: false` so the UI can show
 * "not enough data" instead of a misleading 0%.
 */
export function computeShelfLoad(shelf, products) {
  const byId = products instanceof Map ? products : productIndex(products);
  const limitPerLevel = levelLoadLimitKg(shelf);
  const levels = shelfLevelList(shelf);
  const rows = [];
  let totalLoad = 0;
  let anyWeighed = false;

  for (const lv of levels) {
    const levelIndex = Number(lv.levelIndex) || 0;
    let loadKg = 0;
    let weighed = false;

    for (const face of shelfFaces(shelf)) {
      for (const placement of face.planogram || []) {
        if (Number(placement.levelIndex) !== levelIndex) continue;
        const product = byId.get(placement.productId);
        if (!product) continue;
        const w = placementWeightKg(placement, product);
        if (w > 0) weighed = true;
        loadKg += w;
      }
    }

    totalLoad += loadKg;
    if (weighed) anyWeighed = true;

    rows.push({
      levelIndex,
      levelLabel: levelIndex === 0 ? "Bottom" : levelIndex === 1 ? "Eye-level" : `Level ${levelIndex}`,
      loadKg: Number(loadKg.toFixed(2)),
      limitKg: Number(limitPerLevel.toFixed(2)),
      utilizationPercent: limitPerLevel > 0 ? Number(((loadKg / limitPerLevel) * 100).toFixed(1)) : 0,
      overloaded: loadKg > limitPerLevel + 1e-6,
      weighed,
    });
  }

  const totalLimit = shelfLoadLimitKg(shelf);
  return {
    shelfId: shelf?.id,
    label: shelf?.label || shelf?.displayNumber || shelf?.id,
    levels: rows,
    totalLoadKg: Number(totalLoad.toFixed(2)),
    totalLimitKg: Number(totalLimit.toFixed(2)),
    utilizationPercent: totalLimit > 0 ? Number(((totalLoad / totalLimit) * 100).toFixed(1)) : 0,
    overloaded: totalLoad > totalLimit + 1e-6 || rows.some((r) => r.overloaded),
    weighed: anyWeighed,
  };
}

/** Store-wide weight report: totals plus the shelves that breach a limit. */
export function computeWeightLoadReport(layout, products) {
  const byId = productIndex(products);
  const shelves = layout?.shelves?.length ? layout.shelves : layout?.fixtures || [];

  let totalLoad = 0;
  let totalLimit = 0;
  const overloaded = [];
  let weighedShelves = 0;

  for (const shelf of shelves) {
    const load = computeShelfLoad(shelf, byId);
    totalLoad += load.totalLoadKg;
    totalLimit += load.totalLimitKg;
    if (load.weighed) weighedShelves += 1;
    if (load.overloaded) {
      overloaded.push({
        shelfId: load.shelfId,
        label: load.label,
        totalLoadKg: load.totalLoadKg,
        totalLimitKg: load.totalLimitKg,
        utilizationPercent: load.utilizationPercent,
        overloadedLevels: load.levels.filter((l) => l.overloaded).map((l) => l.levelIndex),
      });
    }
  }

  const missingWeights = (products || []).filter((p) => !hasProductWeight(p)).length;

  return {
    totalLoadKg: Number(totalLoad.toFixed(2)),
    totalCapacityKg: Number(totalLimit.toFixed(2)),
    utilizationPercent: totalLimit > 0 ? Number(((totalLoad / totalLimit) * 100).toFixed(1)) : 0,
    overloadedShelfCount: overloaded.length,
    overloadedShelves: overloaded.slice(0, 25),
    shelvesWithWeightData: weighedShelves,
    productsMissingWeight: missingWeights,
    productsTotal: (products || []).length,
  };
}
