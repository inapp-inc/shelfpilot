/**
 * Merchandising allocation metrics — linear, area, and level fill derived from
 * shelf dimensions (usable width, face depth, levels) and planogram placements.
 */
import { productDimensions, computeMaxFacings, placementUnitCount } from "./planogramMath.js";
import {
  faceDepthMeters,
  levelClearHeights,
  merchandisingFaces,
  shelfUsableWidthMeters,
} from "./shelfGeometry.js";

function shelfFootprintSqm(shelf) {
  const w = Number(shelf?.usableWidthMeters ?? shelf?.widthMeters) || 0;
  const d = Number(shelf?.depthMeters) || 0;
  return w * d;
}

function shelfFloorAreaShareSqm(shelf) {
  const footprint = shelfFootprintSqm(shelf);
  return shelf?.pairId ? footprint / 2 : footprint;
}

export function shelvesFromLayout(layout) {
  return layout?.shelves?.length ? layout.shelves : layout?.fixtures || [];
}

function productIndex(products) {
  const map = new Map();
  for (const p of products || []) map.set(p.id, p);
  return map;
}

/** Linear metres consumed by one placement on a shelf face. */
export function placementLinearMeters(placement, product) {
  const dims = productDimensions(product);
  const facings = Math.max(0, Number(placement?.facings) || 0);
  return facings * dims.widthMeters;
}

/** Shelf-relative area allocated by a placement (uses face depth × linear share of floor strip). */
export function placementShelfAreaSqm(placement, product, shelf, faceCount = 1) {
  const usableW = shelfUsableWidthMeters(shelf);
  if (!(usableW > 0)) return 0;
  const linear = placementLinearMeters(placement, product);
  const depthFacings = Math.max(1, Number(placement?.depthFacings) || 1);
  const faceDepth = faceDepthMeters(shelf);
  const floorStrip = shelfFloorAreaShareSqm(shelf) / Math.max(faceCount, 1);
  const linearShare = Math.min(1, linear / usableW);
  const depthShare = Math.min(1, (productDimensions(product).depthMeters * depthFacings) / Math.max(faceDepth, 0.01));
  return floorStrip * linearShare * depthShare;
}

function iterShelfFaces(shelf) {
  if (shelf?.pairDisplay) return [];
  if (shelf?.faces?.length) return shelf.faces;
  return [{ id: "A", categoryId: shelf?.categoryId || null, planogram: shelf?.planogram || [] }];
}

/**
 * Store-wide merchandising fill vs shelf capacity (linear + floor strip).
 */
export function computeMerchandisingFill(layout, products = []) {
  const byId = productIndex(products);
  const shelves = shelvesFromLayout(layout);
  let totalLinearCapacity = 0;
  let usedLinearMeters = 0;
  let totalFloorCapacitySqm = 0;
  let allocatedFloorSqm = 0;
  let placementCount = 0;

  for (const shelf of shelves) {
    if (shelf?.pairRole === "back") continue;
    const faces = iterShelfFaces(shelf);
    const usableW = shelfUsableWidthMeters(shelf);
    const levels = levelClearHeights(shelf);
    const floorShare = shelfFloorAreaShareSqm(shelf);

    for (const face of faces) {
      const levelCount = Math.max(levels.length, 1);
      totalLinearCapacity += usableW * levelCount;
      totalFloorCapacitySqm += floorShare / Math.max(faces.length, 1);

      const byLevel = new Map();
      for (const placement of face.planogram || []) {
        const product = byId.get(placement.productId);
        if (!product) continue;
        const idx = Number(placement.levelIndex) || 0;
        const linear = placementLinearMeters(placement, product);
        usedLinearMeters += linear;
        allocatedFloorSqm += placementShelfAreaSqm(placement, product, shelf, faces.length);
        placementCount += 1;
        byLevel.set(idx, (byLevel.get(idx) || 0) + linear);
      }

      // Reserved strip for mapped category without planogram
      if (!(face.planogram || []).length && (face.categoryId || shelf.categoryId)) {
        allocatedFloorSqm += floorShare / Math.max(faces.length, 1);
        usedLinearMeters += 0;
      }
    }
  }

  const linearFillPercent =
    totalLinearCapacity > 0 ? Number(((usedLinearMeters / totalLinearCapacity) * 100).toFixed(1)) : 0;
  const areaFillPercent =
    totalFloorCapacitySqm > 0
      ? Number(((allocatedFloorSqm / totalFloorCapacitySqm) * 100).toFixed(1))
      : 0;

  return {
    totalLinearCapacityMeters: Number(totalLinearCapacity.toFixed(2)),
    usedLinearMeters: Number(usedLinearMeters.toFixed(2)),
    linearFillPercent,
    totalShelfFloorCapacitySqm: Number(totalFloorCapacitySqm.toFixed(2)),
    allocatedShelfAreaSqm: Number(allocatedFloorSqm.toFixed(2)),
    areaFillPercent,
    placementCount,
    formula: {
      linearFillPercent: "Σ(facings × productWidth) ÷ Σ(usableWidth × levels per face) × 100",
      areaFillPercent: "Σ shelf-relative placement area ÷ Σ shelf floor strips × 100",
    },
  };
}

/**
 * Category allocation from planogram placements (primary) with shelf-dimension fallback.
 */
export function computeCategoryMerchAllocation(layout, categories, products = [], resolveCategoryId, categoryDisplayName) {
  const byId = productIndex(products);
  const shelves = shelvesFromLayout(layout);
  const byCat = new Map();
  let totalArea = 0;
  let totalLinear = 0;

  const resolve = resolveCategoryId || ((id) => id);
  const displayName = categoryDisplayName || ((id) => id);

  for (const shelf of shelves) {
    if (shelf?.pairRole === "back") continue;
    const faces = iterShelfFaces(shelf);
    const usableW = shelfUsableWidthMeters(shelf);
    const floorShare = shelfFloorAreaShareSqm(shelf);
    const faceFloor = floorShare / Math.max(faces.length, 1);
    const linearCap = usableW;

    for (const face of faces) {
      const planogram = face.planogram || [];
      let faceHasMerch = false;

      for (const placement of planogram) {
        const product = byId.get(placement.productId);
        if (!product) continue;
        faceHasMerch = true;
        const linear = placementLinearMeters(placement, product);
        const area = placementShelfAreaSqm(placement, product, shelf, faces.length);
        const rawCatId = product.categoryId || face.categoryId || shelf.categoryId;
        if (!rawCatId) continue;
        const key = resolve(rawCatId) || rawCatId;
        const cat = categories.find((c) => c.id === key);
        const prev = byCat.get(key) || {
          categoryId: key,
          categoryName: displayName(rawCatId, categories),
          color: cat?.color || face.color || shelf.color || "#A30A2A",
          areaSqm: 0,
          linearMeters: 0,
          facings: 0,
          shelfCount: 0,
        };
        prev.areaSqm += area;
        prev.linearMeters += linear;
        prev.facings += Math.max(0, Number(placement.facings) || 0);
        byCat.set(key, prev);
        totalArea += area;
        totalLinear += linear;
      }

      if (!faceHasMerch) {
        const catIds = face.categoryId ? [face.categoryId] : [];
        if (!catIds.length && shelf.categoryId) catIds.push(shelf.categoryId);
        if (!catIds.length) continue;
        for (const rawCatId of catIds) {
          const key = resolve(rawCatId) || rawCatId;
          const cat = categories.find((c) => c.id === key);
          const prev = byCat.get(key) || {
            categoryId: key,
            categoryName: displayName(rawCatId, categories),
            color: cat?.color || shelf.color || "#A30A2A",
            areaSqm: 0,
            linearMeters: 0,
            facings: 0,
            shelfCount: 0,
          };
          prev.areaSqm += faceFloor;
          prev.linearMeters += linearCap;
          prev.shelfCount += 1;
          byCat.set(key, prev);
          totalArea += faceFloor;
          totalLinear += linearCap;
        }
      }
    }
  }

  const rows = [...byCat.values()]
    .map((row) => ({
      ...row,
      areaSqm: Number(row.areaSqm.toFixed(2)),
      linearMeters: Number(row.linearMeters.toFixed(2)),
      facings: Math.round(row.facings),
      shelfCount: Math.round(row.shelfCount),
      areaSharePercent: totalArea > 0 ? Number(((row.areaSqm / totalArea) * 100).toFixed(1)) : 0,
      linearSharePercent: totalLinear > 0 ? Number(((row.linearMeters / totalLinear) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.areaSqm - a.areaSqm);

  return {
    rows,
    totalMappedAreaSqm: Number(totalArea.toFixed(2)),
    totalLinearMeters: Number(totalLinear.toFixed(2)),
    formula:
      "planogram: area from (linear ÷ usableWidth × face floor strip × depth share); category-only faces reserve full face floor strip + usable width",
  };
}

/**
 * Per-level linear fill using shelf usable width and planogram facings × product width.
 */
export function computeVerticalMerchUtilization(layout, products = []) {
  const byId = productIndex(products);
  const shelves = shelvesFromLayout(layout);
  const byLevel = new Map();

  for (const shelf of shelves) {
    if (shelf?.pairRole === "back") continue;
    const usableW = shelfUsableWidthMeters(shelf);
    const levels = shelf.levels?.length
      ? shelf.levels.map((l) => Number(l.levelIndex) || 0)
      : levelClearHeights(shelf).map((l) => l.levelIndex);

    for (const face of iterShelfFaces(shelf)) {
      for (const levelIndex of levels) {
        const prev = byLevel.get(levelIndex) || {
          levelIndex,
          linearCapacityMeters: 0,
          usedLinearMeters: 0,
          fixtureCount: 0,
        };
        prev.linearCapacityMeters += usableW;
        prev.fixtureCount += 1;

        let used = 0;
        for (const placement of face.planogram || []) {
          if (Number(placement.levelIndex) !== levelIndex) continue;
          const product = byId.get(placement.productId);
          if (!product) continue;
          used += placementLinearMeters(placement, product);
        }
        prev.usedLinearMeters += Math.min(used, usableW);
        byLevel.set(levelIndex, prev);
      }
    }
  }

  const levels = [...byLevel.values()]
    .sort((a, b) => a.levelIndex - b.levelIndex)
    .map((row) => ({
      levelIndex: row.levelIndex,
      linearCapacityMeters: Number(row.linearCapacityMeters.toFixed(2)),
      usedLinearMeters: Number(row.usedLinearMeters.toFixed(2)),
      utilizedAreaSqm: Number(row.usedLinearMeters.toFixed(2)),
      totalAreaSqm: Number(row.linearCapacityMeters.toFixed(2)),
      utilizationPercent:
        row.linearCapacityMeters > 0
          ? Number(((row.usedLinearMeters / row.linearCapacityMeters) * 100).toFixed(1))
          : 0,
      fixtureCount: row.fixtureCount,
      levelLabel:
        row.levelIndex === 0 ? "Bottom" : row.levelIndex === 1 ? "Eye-level" : `Level ${row.levelIndex}`,
    }));

  return {
    levels,
    formula:
      "per level: Σ min(usableWidth, Σ facings×productWidth) ÷ Σ usableWidth per face-level × 100",
  };
}

/** Facings report with shelf-width validation. */
export function computeFacingsReport(layout, categories, products = [], resolveCategoryId, categoryDisplayName) {
  const byId = productIndex(products);
  const shelves = shelvesFromLayout(layout);
  const byCat = new Map();
  let facingsTotal = 0;
  let overfillCount = 0;
  const overfills = [];

  const resolve = resolveCategoryId || ((id) => id);
  const displayName = categoryDisplayName || ((id) => id);

  for (const shelf of shelves) {
    if (shelf?.pairRole === "back") continue;
    for (const face of iterShelfFaces(shelf)) {
      const usableW = shelfUsableWidthMeters(shelf);
      const byLevel = new Map();

      for (const placement of face.planogram || []) {
        const n = placementUnitCount(placement);
        if (!n) continue;
        facingsTotal += n;
        const wide = Math.max(0, Number(placement.facings) || 0);
        const levelIndex = Number(placement.levelIndex) || 0;
        const product = byId.get(placement.productId);
        const dims = product ? productDimensions(product) : { widthMeters: 0.2 };
        const prevLevel = byLevel.get(levelIndex) || { usedLinear: 0, productId: placement.productId };
        prevLevel.usedLinear += wide * dims.widthMeters;
        prevLevel.productId = placement.productId;
        byLevel.set(levelIndex, prevLevel);

        const rawCatId = placement.categoryId || face.categoryId || shelf.categoryId || "unmapped";
        const key = rawCatId === "unmapped" ? "unmapped" : resolve(rawCatId) || rawCatId;
        const cat = categories.find((c) => c.id === key);
        const prev = byCat.get(key) || {
          categoryId: key,
          categoryName: rawCatId === "unmapped" ? "Unmapped" : displayName(rawCatId, categories),
          facings: 0,
          color: cat?.color || face.color || shelf.color || "#A30A2A",
        };
        prev.facings += n;
        byCat.set(key, prev);
      }

      for (const [levelIndex, levelData] of byLevel) {
        const usedLinear = levelData.usedLinear;
        if (usedLinear > usableW + 1e-6) {
          overfillCount += 1;
          const product = byId.get(levelData.productId);
          overfills.push({
            shelfId: shelf.id,
            faceId: face.id,
            levelIndex,
            usableWidthMeters: usableW,
            usedLinearMeters: Number(usedLinear.toFixed(2)),
            maxFacings: product
              ? computeMaxFacings(usableW, productDimensions(product).widthMeters)
              : null,
          });
        }
      }
    }
  }

  return {
    facingsTotal,
    facingsByCategory: [...byCat.values()].sort((a, b) => b.facings - a.facings),
    overfillCount,
    overfills: overfills.slice(0, 20),
    formula: "facings validated against usableWidthMeters per level; overfill when Σ(facings×productWidth) > usable width",
  };
}

/** True when shelf AABB overlaps zone rectangle. */
export function shelfFootprintOverlapsZone(shelf, zone) {
  const w = shelfUsableWidthMeters(shelf);
  const d = Number(shelf.depthMeters) || 0;
  const sx = Number(shelf.x) || 0;
  const sy = Number(shelf.y) || 0;
  const zx = Number(zone.x) || 0;
  const zy = Number(zone.y) || 0;
  const zw = Number(zone.widthMeters) || 0;
  const zd = Number(zone.depthMeters) || 0;
  return !(sx + w <= zx || sx >= zx + zw || sy + d <= zy || sy >= zy + zd);
}
