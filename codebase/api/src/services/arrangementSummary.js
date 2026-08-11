/**
 * Shelf arrangement & volume summary — workflow gate between fixture placement
 * and product allocation / planogram fill.
 *
 * Derives row structure from packed shelves, floor utilization from space math,
 * and storage volume from volumeMath (available capacity before products).
 */
import { computeSpaceUtilization } from "./analyticsReports.js";
import { countGondolaUnits } from "./shelfFaces.js";
import {
  computeStorageVolume,
  levelClearHeights,
  merchandisingFaces,
  productVolumeM3,
  shelfStorageVolumeM3,
} from "./volumeMath.js";

/** Typical packaged grocery unit when catalog average is unavailable (~0.002 m³ ≈ ~0.07 cu ft). */
const FALLBACK_UNIT_VOLUME_M3 = 0.002;

function layoutShelves(layout) {
  return layout?.shelves?.length ? layout.shelves : layout?.fixtures || [];
}

/** Front (or unpaired) shelves only — a gondola pair is one fixture for row counting. */
function fixtureUnits(shelves) {
  const seen = new Set();
  const units = [];
  for (const s of shelves || []) {
    if (s.pairId) {
      if (seen.has(s.pairId)) continue;
      seen.add(s.pairId);
      if (s.pairRole === "back") continue;
    }
    units.push(s);
  }
  return units;
}

/**
 * Cluster fixtures into rows by snapped centerline (Y for east–west runs, X for north–south).
 * @returns {{ rowCount: number, shelvesPerRow: number, rows: Array<{ key: string, count: number }> }}
 */
export function computeShelfRows(layout) {
  const units = fixtureUnits(layoutShelves(layout));
  if (!units.length) {
    return { rowCount: 0, shelvesPerRow: 0, rows: [] };
  }

  const buckets = new Map();
  for (const s of units) {
    const rot = (((Number(s.rotationDeg) || 0) % 360) + 360) % 360;
    const alongX = rot < 45 || rot > 315 || (rot > 135 && rot < 225);
    const snap = (v) => Math.round(Number(v || 0) * 2) / 2;
    const key = alongX ? `y:${snap(s.y)}` : `x:${snap(s.x)}`;
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(s);
  }

  const rows = [...buckets.entries()]
    .map(([key, list]) => ({ key, count: list.length }))
    .sort((a, b) => a.key.localeCompare(b.key));

  const rowCount = rows.length;
  const shelvesPerRow =
    rowCount > 0 ? Number((rows.reduce((s, r) => s + r.count, 0) / rowCount).toFixed(1)) : 0;

  return { rowCount, shelvesPerRow, rows };
}

/** Merchandising "bays" = levels × faces across all shelf records. */
export function countShelfBays(layout) {
  let bays = 0;
  for (const shelf of layoutShelves(layout)) {
    const levels = levelClearHeights(shelf).length || 1;
    const faces = merchandisingFaces(shelf).length || 1;
    bays += levels * faces;
  }
  return bays;
}

function averageCatalogUnitVolumeM3(products) {
  const vols = (products || [])
    .map((p) => productVolumeM3(p))
    .filter((v) => Number.isFinite(v) && v > 1e-6);
  if (!vols.length) return FALLBACK_UNIT_VOLUME_M3;
  return vols.reduce((s, v) => s + v, 0) / vols.length;
}

/**
 * Full arrangement + volume + capacity summary for the workflow step.
 */
export function computeArrangementSummary(layout, products = []) {
  const shelves = layoutShelves(layout);
  const space = computeSpaceUtilization(layout);
  const volume = computeStorageVolume(layout, products);
  const rows = computeShelfRows(layout);
  const totalShelves = countGondolaUnits(shelves);
  const totalBays = countShelfBays(layout);
  const unitVol = averageCatalogUnitVolumeM3(products);
  const available = Number(volume.availableVolumeM3) || 0;
  const used = Number(volume.usedVolumeM3) || 0;
  const free = Number(volume.freeVolumeM3) || 0;
  const maxProductQuantity = available > 0 ? Math.floor(available / unitVol) : 0;
  const estimatedUsedUnits = used > 0 ? Math.floor(used / unitVol) : 0;

  const perShelf = shelves.map((shelf) => {
    const avail = shelfStorageVolumeM3(shelf);
    return {
      shelfId: shelf.id,
      displayNumber: shelf.displayNumber ?? null,
      volumeM3: Number(avail.toFixed(4)),
      levels: levelClearHeights(shelf).length,
      faces: merchandisingFaces(shelf).length,
    };
  });

  return {
    arrangement: {
      rowCount: rows.rowCount,
      shelvesPerRow: rows.shelvesPerRow,
      totalShelves,
      totalBays,
      remainingSpaceSqm: space.unusedAreaSqm,
      fixtureUtilizationPercent: space.utilizationPercent,
      rows: rows.rows,
    },
    space: {
      storeAreaSqm: space.totalStoreAreaSqm,
      walkingAreaSqm: space.aisleAreaSqm,
      fixtureAreaSqm: space.allocatedAreaSqm,
      unusedAreaSqm: space.unusedAreaSqm,
      obstacleAreaSqm: space.obstacleAreaSqm,
      overallUtilizationPercent: space.plannedPercent,
      fixtureUtilizationPercent: space.utilizationPercent,
    },
    volume: {
      availableVolumeM3: volume.availableVolumeM3,
      usedVolumeM3: volume.usedVolumeM3,
      freeVolumeM3: volume.freeVolumeM3,
      fillPercent: volume.fillPercent,
      levels: volume.levels,
      perShelf,
      totalStoreVolumeM3: volume.availableVolumeM3,
    },
    capacity: {
      maxProductQuantity,
      estimatedPlacedQuantity: estimatedUsedUnits,
      remainingShelfSpaceM3: free,
      usedShelfSpaceM3: used,
      emptyShelfSpaceM3: free,
      capacityUtilizationPercent: volume.fillPercent,
      unitVolumeM3: Number(unitVol.toFixed(6)),
    },
    accepted: Boolean(layout?.arrangementAcceptedAt),
    arrangementAcceptedAt: layout?.arrangementAcceptedAt || null,
    arrangementAcceptedBy: layout?.arrangementAcceptedBy || null,
  };
}
