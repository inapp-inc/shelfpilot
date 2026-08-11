/**
 * Index planogram placements for find-product / find-category dialogs.
 */
import { categoryLabel } from "../catalog/buildCategoryTree.js";
import { productDimensions } from "../productCatalog.js";
import {
  levelDisplayLabel,
  positionDisplayLabel,
  effectiveSegmentsForLevel,
  resolveSegmentId,
} from "./planogramSegments.js";
import { aisleDisplayLabel, normalizeShelfUI, planogramRowsOnPhysicalShelf, shelfDisplayLabel, segmentFaceIdForShelf } from "./shelfFaces.js";

function positionForPlacement(shelf, faceId, placement) {
  const levelIndex = Number(placement?.levelIndex) || 0;
  const segments = effectiveSegmentsForLevel(shelf, faceId, levelIndex);
  const segId = resolveSegmentId(placement, shelf, faceId);
  const idx = Math.max(
    0,
    segments.findIndex((s) => s.id === segId)
  );
  const seg = segments[idx] || segments[0];
  return {
    positionIndex: idx,
    positionLabel: positionDisplayLabel(idx, seg?.label),
    segmentId: seg?.id || segId || null,
  };
}

function placementSpace(product, placement) {
  const dims = productDimensions(product);
  const facings = Math.max(0, Number(placement?.facings) || 0);
  const depthFacings = Math.max(1, Number(placement?.depthFacings) || 1);
  const linearMeters = facings * dims.widthMeters;
  const footprintSqm = linearMeters * dims.depthMeters * depthFacings;
  const volumeM3 = footprintSqm * dims.heightMeters;
  return {
    facings,
    depthFacings,
    widthMeters: dims.widthMeters,
    depthMeters: dims.depthMeters,
    heightMeters: dims.heightMeters,
    linearMeters,
    footprintSqm,
    volumeM3,
  };
}

/** Flatten every product placement on the layout with shelf # / level / position. */
export function collectLayoutPlacements(layout, products = [], categories = []) {
  const shelves = layout?.shelves?.length ? layout.shelves : layout?.fixtures || [];
  const aisles = layout?.aisles || [];
  const productById = new Map((products || []).map((p) => [p.id, p]));
  const rows = [];

  for (const raw of shelves) {
    if (!raw || raw.pairDisplay) continue;
    const shelf = normalizeShelfUI(raw);
    const shelfLabel = shelfDisplayLabel(shelf, aisles);
    const aisle = (aisles || []).find((a) => a.id === shelf?.aisleId);
    const aisleLabel = aisle ? aisleDisplayLabel(aisle) : null;
    const faceIds =
      shelf.faces?.some((f) => f.id === "B" && (f.planogram?.length || f.segments?.length))
        ? ["A", "B"]
        : [segmentFaceIdForShelf(shelf, "A")];

    for (const faceId of faceIds) {
      const planogram = planogramRowsOnPhysicalShelf(shelf, faceId);
      for (const placement of planogram) {
        const product = productById.get(placement.productId) || null;
        const pos = positionForPlacement(shelf, faceId, placement);
        const space = placementSpace(product, placement);
        const categoryId = product?.categoryId || shelf?.categoryId || null;
        const faceSuffix = faceIds.length > 1 ? ` · Face ${faceId}` : "";
        rows.push({
          id: `${shelf.id}:${faceId}:${placement.id || placement.productId}:${placement.levelIndex}:${pos.segmentId}`,
          productId: placement.productId,
          productName: product?.name || placement.productId,
          sku: product?.sku || product?.barcode || "",
          categoryId,
          categoryName: categoryId ? categoryLabel(categories, categoryId) : "Uncategorized",
          shelfId: shelf.id,
          shelfLabel: `${shelfLabel || shelf.label || shelf.id}${faceSuffix}`,
          aisleId: aisle?.id || shelf?.aisleId || null,
          aisleLabel,
          levelIndex: Number(placement.levelIndex) || 0,
          levelLabel: levelDisplayLabel(placement.levelIndex),
          positionIndex: pos.positionIndex,
          positionLabel: pos.positionLabel,
          facings: space.facings || null,
          depthFacings: space.depthFacings,
          linearMeters: space.linearMeters,
          footprintSqm: space.footprintSqm,
          volumeM3: space.volumeM3,
          locationText: `${shelfLabel || "—"} · ${levelDisplayLabel(placement.levelIndex)} · ${pos.positionLabel}${faceSuffix}`,
          directionsText: aisleLabel
            ? `Aisle ${aisleLabel} · Shelf ${shelfLabel || "—"} · ${levelDisplayLabel(placement.levelIndex)} · ${pos.positionLabel}${faceSuffix}`
            : `${shelfLabel || "—"} · ${levelDisplayLabel(placement.levelIndex)} · ${pos.positionLabel}${faceSuffix}`,
        });
      }
    }
  }

  rows.sort((a, b) => {
    const c = String(a.productName).localeCompare(String(b.productName));
    if (c) return c;
    return String(a.locationText).localeCompare(String(b.locationText));
  });
  return rows;
}

/** Aggregate space used by one product across all its placements. */
export function summarizeProductSpace(placementsForProduct) {
  const rows = placementsForProduct || [];
  let facings = 0;
  let linearMeters = 0;
  let footprintSqm = 0;
  let volumeM3 = 0;
  for (const row of rows) {
    facings += Number(row.facings) || 0;
    linearMeters += Number(row.linearMeters) || 0;
    footprintSqm += Number(row.footprintSqm) || 0;
    volumeM3 += Number(row.volumeM3) || 0;
  }
  return {
    locationCount: rows.length,
    facings,
    linearMeters: Number(linearMeters.toFixed(3)),
    footprintSqm: Number(footprintSqm.toFixed(4)),
    volumeM3: Number(volumeM3.toFixed(4)),
  };
}

export function uniquePlacedProducts(placements) {
  const map = new Map();
  for (const row of placements) {
    if (!map.has(row.productId)) {
      map.set(row.productId, {
        productId: row.productId,
        productName: row.productName,
        sku: row.sku,
        categoryId: row.categoryId,
        categoryName: row.categoryName,
        placementCount: 0,
        linearMeters: 0,
        volumeM3: 0,
      });
    }
    const entry = map.get(row.productId);
    entry.placementCount += 1;
    entry.linearMeters += Number(row.linearMeters) || 0;
    entry.volumeM3 += Number(row.volumeM3) || 0;
  }
  return [...map.values()]
    .map((p) => ({
      ...p,
      linearMeters: Number(p.linearMeters.toFixed(3)),
      volumeM3: Number(p.volumeM3.toFixed(4)),
    }))
    .sort((a, b) => a.productName.localeCompare(b.productName));
}

export function placementsGroupedByCategory(placements) {
  const map = new Map();
  for (const row of placements) {
    const key = row.categoryId || "__none__";
    if (!map.has(key)) {
      map.set(key, {
        categoryId: key,
        categoryName: row.categoryName || "Uncategorized",
        placements: [],
        shelves: new Set(),
        linearMeters: 0,
        volumeM3: 0,
      });
    }
    const g = map.get(key);
    g.placements.push(row);
    g.shelves.add(row.shelfLabel);
    g.linearMeters += Number(row.linearMeters) || 0;
    g.volumeM3 += Number(row.volumeM3) || 0;
  }
  return [...map.values()]
    .map((g) => ({
      categoryId: g.categoryId,
      categoryName: g.categoryName,
      placements: g.placements,
      shelfCount: g.shelves.size,
      linearMeters: Number(g.linearMeters.toFixed(3)),
      volumeM3: Number(g.volumeM3.toFixed(4)),
    }))
    .sort((a, b) => b.placements.length - a.placements.length);
}
