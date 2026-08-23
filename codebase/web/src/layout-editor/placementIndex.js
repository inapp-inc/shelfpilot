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
import {
  aisleDisplayLabel,
  isPairedShelf,
  normalizeShelfUI,
  planogramRowsOnPhysicalShelf,
  shelfDisplayLabel,
  segmentFaceIdForShelf,
} from "./shelfFaces.js";

function placementRowId(shelfId, faceKey, placement, segmentId) {
  return `${shelfId}:${faceKey}:${placement.productId}:${placement.levelIndex}:${segmentId}:${placement.id || ""}`;
}

function placementSlotKey(placement, shelf, faceId) {
  const pos = positionForPlacement(shelf, faceId, placement);
  return `${placement.productId}:${Number(placement.levelIndex) || 0}:${pos.segmentId || ""}`;
}

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

/** Map duplicate catalog SKUs (same display name) to one canonical product id. */
export function buildProductAliasMap(products = [], categories = [], vertical = null) {
  const groups = new Map();
  for (const p of products || []) {
    const key = String(p.name || "")
      .trim()
      .toLowerCase();
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  }
  const alias = new Map();
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    const canonical = pickCanonicalCatalogProduct(group, categories, vertical);
    for (const p of group) {
      if (p.id !== canonical.id) alias.set(p.id, canonical.id);
    }
  }
  return alias;
}

function pickCanonicalCatalogProduct(group, categories, vertical) {
  let candidates = group;
  if (vertical) {
    const inVertical = group.filter((p) => {
      const cat = (categories || []).find((c) => c.id === p.categoryId);
      return !cat?.vertical || cat.vertical === vertical;
    });
    if (inVertical.length) candidates = inVertical;
  }
  return [...candidates].sort((a, b) => {
    const aHm = a.id.startsWith("hm-") ? 0 : 1;
    const bHm = b.id.startsWith("hm-") ? 0 : 1;
    if (aHm !== bHm) return aHm - bHm;
    return a.id.localeCompare(b.id);
  })[0];
}

export function canonicalProductId(productId, aliasMap) {
  if (!productId || !aliasMap?.size) return productId;
  let id = productId;
  const seen = new Set();
  while (aliasMap.has(id) && !seen.has(id)) {
    seen.add(id);
    id = aliasMap.get(id);
  }
  return id;
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

/** Storage faces to read on one physical shelf record. */
function storageFaceIdsForShelf(raw, shelf) {
  if (isPairedShelf(raw) && !raw.pairDisplay) {
    return [segmentFaceIdForShelf(shelf, "A")];
  }
  const hasFaceB =
    shelf.faces?.some((f) => f.id === "B" && (f.planogram?.length || f.segments?.length)) ||
    (raw.faces || []).some((f) => f.id === "B" && (f.planogram || []).length);
  return hasFaceB ? ["A", "B"] : [segmentFaceIdForShelf(shelf, "A")];
}

function merchandisingFaceForRecord(raw, storageFaceId) {
  if (isPairedShelf(raw) && !raw.pairDisplay) {
    return raw.pairRole === "back" ? "B" : "A";
  }
  return storageFaceId === "B" ? "B" : "A";
}

function appendPlacementRow({
  raw,
  shelf,
  storageFaceId,
  merchandisingFaceId,
  multiFace,
  placement,
  aisles,
  productById,
  categories,
  rows,
  seen,
  aliasMap = null,
}) {
  if (!placement?.productId) return;
  const sourceProductId = placement.productId;
  const productId = canonicalProductId(sourceProductId, aliasMap);
  const pos = positionForPlacement(shelf, storageFaceId, placement);
  const faceKey = `${merchandisingFaceId}:${storageFaceId}`;
  const rowId = placementRowId(shelf.id, faceKey, { ...placement, productId }, pos.segmentId);
  if (seen.has(rowId)) return;
  seen.add(rowId);

  const product = productById.get(productId) || productById.get(sourceProductId) || null;
  const space = placementSpace(product, placement);
  const categoryId = product?.categoryId || shelf?.categoryId || null;
  const shelfLabel = shelfDisplayLabel(shelf, aisles);
  const aisle = (aisles || []).find((a) => a.id === shelf?.aisleId);
  const aisleLabel = aisle ? aisleDisplayLabel(aisle) : null;
  const faceSuffix =
    multiFace && merchandisingFaceId !== "A" && !isPairedShelf(raw)
      ? ` · Face ${merchandisingFaceId}`
      : "";

  rows.push({
    id: rowId,
    productId,
    sourceProductId: sourceProductId !== productId ? sourceProductId : null,
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
    faceId: merchandisingFaceId,
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

/** Flatten every product placement on the layout with shelf # / level / position. */
export function collectLayoutPlacements(layout, products = [], categories = [], options = {}) {
  const dedupeGondolaMirrors = options.dedupeGondolaMirrors !== false;
  const shelves = layout?.shelves?.length ? layout.shelves : layout?.fixtures || [];
  const aisles = layout?.aisles || [];
  const productById = new Map((products || []).map((p) => [p.id, p]));
  const aliasMap = buildProductAliasMap(products, categories, layout?.vertical);
  const rows = [];
  const seen = new Set();
  const pairSlots = dedupeGondolaMirrors ? new Map() : null;

  for (const raw of shelves) {
    if (!raw || raw.pairDisplay) continue;
    const shelf = normalizeShelfUI(raw);
    const storageFaceIds = storageFaceIdsForShelf(raw, shelf);

    for (const storageFaceId of storageFaceIds) {
      const planogram = planogramRowsOnPhysicalShelf(raw, storageFaceId);
      if (!planogram.length) continue;
      const merchandisingFaceId = merchandisingFaceForRecord(raw, storageFaceId);

      for (const placement of planogram) {
        if (dedupeGondolaMirrors && raw.pairId) {
          const slot = `${raw.pairId}:${placementSlotKey(placement, shelf, storageFaceId)}`;
          const slots = pairSlots.get(raw.pairId) || new Set();
          if (slots.has(slot)) continue;
          slots.add(slot);
          pairSlots.set(raw.pairId, slots);
        }
        appendPlacementRow({
          raw,
          shelf,
          storageFaceId,
          merchandisingFaceId,
          multiFace: storageFaceIds.length > 1,
          placement,
          aisles,
          productById,
          categories,
          rows,
          seen,
          aliasMap,
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

/** Cheap signature so UI recomputes when planogram payloads arrive. */
export function layoutPlanogramSignature(layout) {
  let count = 0;
  let bytes = 0;
  for (const raw of layout?.shelves || layout?.fixtures || []) {
    if (!raw || raw.pairDisplay) continue;
    for (const p of raw.planogram || []) {
      count += 1;
      bytes += String(p?.productId || "").length;
    }
    for (const face of raw.faces || []) {
      for (const p of face.planogram || []) {
        count += 1;
        bytes += String(p?.productId || "").length;
      }
    }
  }
  return `${count}:${bytes}`;
}
