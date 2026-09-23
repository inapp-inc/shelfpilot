/**
 * Auto-fill shelf planograms from catalog products matching each face category.
 * Facings, depth, and vertical stack are derived from product vs shelf dimensions.
 */
import { randomUUID } from "node:crypto";
import { normalizeShelf, faceCategoryId, facePlanogram, syncLegacyFromFaces } from "./shelfFaces.js";
import { listCategoriesForLayout, productAllowedForShelf, resolveCategoryId } from "./categoryTree.js";
import { clampDepthFacings, clampStackLayers, previewFacings } from "./planogramMath.js";
import { levelSegmentsList } from "./shelfSegments.js";
import { levelLoadLimitKg, productWeightKg, unitsWithinLoad } from "./weightMath.js";

function shelfLevels(shelf) {
  if (Array.isArray(shelf.levels) && shelf.levels.length) return shelf.levels;
  const n = Math.max(1, Number(shelf.defaultLevels) || 2);
  return Array.from({ length: n }, (_, i) => ({ levelIndex: i }));
}

function candidatesForFace(products, shelf, faceId, categories) {
  const categoryId = faceCategoryId(shelf, faceId) || shelf.categoryId;
  if (!categoryId) return [];
  return (products || [])
    .filter((p) => productAllowedForShelf(p, categoryId, categories))
    .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
}

function facesToFill(shelf) {
  normalizeShelf(shelf);
  if (shelf.pairId) {
    return [{ faceId: "A", categoryId: shelf.categoryId ?? shelf.faces?.[0]?.categoryId }];
  }
  return (shelf.faces || [])
    .filter((f) => f.categoryId)
    .map((f) => ({ faceId: f.id === "B" ? "B" : "A", categoryId: f.categoryId }));
}

function cellOccupied(pog, levelIndex, segmentId) {
  const segKey = String(segmentId || "");
  return (pog || []).some(
    (p) => Number(p.levelIndex) === Number(levelIndex) && String(p.segmentId || "") === segKey
  );
}

function faceAlreadyHasProduct(pog, productId) {
  return (pog || []).some((p) => p.productId === productId);
}

function collectPlacedProductIds(layout) {
  const ids = new Set();
  for (const raw of layout.shelves || []) {
    const shelf = normalizeShelf({ ...raw });
    for (const face of shelf.faces || []) {
      for (const p of face.planogram || []) {
        if (p?.productId) ids.add(p.productId);
      }
    }
    for (const p of shelf.planogram || []) {
      if (p?.productId) ids.add(p.productId);
    }
  }
  return ids;
}

/**
 * Trim wide × deep × stack units so a level stays under its safe working load.
 * Vertical stack is shed first, then depth, then width — keeps the front presentation.
 */
export function fitToLoadLimit(facings, depthFacings, stackLayers, unitWeightKg, limitKg) {
  let f = Math.max(1, Number(facings) || 1);
  let d = Math.max(1, Number(depthFacings) || 1);
  let s = Math.max(1, Number(stackLayers) || 1);

  if (!Number.isFinite(unitWeightKg) || unitWeightKg <= 0) {
    return { facings: f, depthFacings: d, stackLayers: s, capped: false };
  }
  const maxUnits = unitsWithinLoad(limitKg, 0, unitWeightKg);
  if (!Number.isFinite(maxUnits) || f * d * s <= maxUnits) {
    return { facings: f, depthFacings: d, stackLayers: s, capped: false };
  }
  if (maxUnits < 1) {
    return { facings: 1, depthFacings: 1, stackLayers: 1, capped: true };
  }

  s = Math.max(1, Math.min(s, Math.floor(maxUnits / (f * d))));
  if (f * d * s <= maxUnits) {
    return { facings: f, depthFacings: d, stackLayers: s, capped: true };
  }
  d = Math.max(1, Math.min(d, Math.floor(maxUnits / (f * s))));
  if (f * d * s <= maxUnits) {
    return { facings: f, depthFacings: d, stackLayers: s, capped: true };
  }
  f = Math.max(1, Math.min(f, Math.floor(maxUnits / (d * s))));
  return { facings: f, depthFacings: d, stackLayers: s, capped: true };
}

function tryPlaceProduct({
  pog,
  shelf,
  faceId,
  levelIndex,
  segmentId,
  product,
  categoryId,
  levelLoadLimit,
  loadCappedRef,
}) {
  const preview = previewFacings({
    shelf: { ...shelf, categoryId },
    product,
    levelIndex,
    segmentId,
    faceId,
  });
  if (!preview.maxFacings || !preview.fitsLevelHeight) return false;

  const maxDepthFacings = Math.max(1, preview.maxDepthFacings || 1);
  const maxStackLayers = Math.max(1, preview.maxStackLayers || 1);
  const fitted = fitToLoadLimit(
    preview.maxFacings,
    clampDepthFacings(null, maxDepthFacings),
    clampStackLayers(null, maxStackLayers),
    productWeightKg(product),
    levelLoadLimit
  );
  if (fitted.capped && loadCappedRef) loadCappedRef.count += 1;

  pog.push({
    id: `pog-${randomUUID().slice(0, 8)}`,
    productId: product.id,
    levelIndex,
    facings: fitted.facings,
    maxFacings: preview.maxFacings,
    depthFacings: fitted.depthFacings,
    maxDepthFacings,
    stackLayers: fitted.stackLayers,
    maxStackLayers,
    positionX: 0,
    faceId,
    segmentId: segmentId || undefined,
  });
  return true;
}

function fillFaceSlots({ shelf, raw, faceId, products, categories, categoryCursor, loadCappedRef }) {
  const categoryId = faceCategoryId(shelf, faceId) || shelf.categoryId;
  if (!categoryId) return 0;

  const candidates = candidatesForFace(products, shelf, faceId, categories);
  if (!candidates.length) return 0;

  const pog = facePlanogram(shelf, faceId);
  pog.length = 0;

  const levels = shelfLevels(shelf);
  const usedOnThisFace = new Set();
  let candidateCursor = categoryCursor.get(categoryId) ?? 0;
  let placements = 0;
  const levelLoadLimit = levelLoadLimitKg(shelf);

  for (const lv of levels) {
    const levelIndex = Number(lv.levelIndex) || 0;
    const segments = levelSegmentsList(shelf, faceId, levelIndex);

    for (const seg of segments) {
      if (cellOccupied(pog, levelIndex, seg.id)) continue;

      for (let attempt = 0; attempt < candidates.length; attempt += 1) {
        const product = candidates[(candidateCursor + attempt) % candidates.length];
        if (usedOnThisFace.has(product.id)) continue;

        if (
          tryPlaceProduct({
            pog,
            shelf,
            faceId,
            levelIndex,
            segmentId: seg.id,
            product,
            categoryId,
            levelLoadLimit,
            loadCappedRef,
          })
        ) {
          usedOnThisFace.add(product.id);
          candidateCursor = (candidateCursor + attempt + 1) % candidates.length;
          placements += 1;
          break;
        }
      }
    }
  }

  categoryCursor.set(categoryId, candidateCursor);
  syncLegacyFromFaces(shelf);
  Object.assign(raw, shelf);
  return placements;
}

/** Place any catalog SKU not yet on the layout into the next open bay cell. */
function fillRemainingCatalogProducts(layout, products, categories, loadCappedRef) {
  let placements = 0;
  const placedGlobally = collectPlacedProductIds(layout);
  const missing = (products || []).filter((p) => p?.id && !placedGlobally.has(p.id));
  if (!missing.length) return 0;

  for (const product of missing) {
    let placed = false;
    for (const raw of layout.shelves || []) {
      if (placed) break;
      const shelf = normalizeShelf({ ...raw });
      const levelLoadLimit = levelLoadLimitKg(shelf);

      for (const { faceId } of facesToFill(shelf)) {
        if (placed) break;
        const categoryId = faceCategoryId(shelf, faceId) || shelf.categoryId;
        if (!categoryId || !productAllowedForShelf(product, categoryId, categories)) continue;

        const pog = facePlanogram(shelf, faceId);
        if (faceAlreadyHasProduct(pog, product.id)) continue;

        for (const lv of shelfLevels(shelf)) {
          if (placed) break;
          const levelIndex = Number(lv.levelIndex) || 0;
          for (const seg of levelSegmentsList(shelf, faceId, levelIndex)) {
            if (cellOccupied(pog, levelIndex, seg.id)) continue;
            if (
              tryPlaceProduct({
                pog,
                shelf,
                faceId,
                levelIndex,
                segmentId: seg.id,
                product,
                categoryId,
                levelLoadLimit,
                loadCappedRef,
              })
            ) {
              placed = true;
              placements += 1;
              placedGlobally.add(product.id);
              syncLegacyFromFaces(shelf);
              Object.assign(raw, shelf);
              break;
            }
          }
        }
      }
    }
  }

  return placements;
}

/**
 * Fill planograms on all shelves; returns total placements added.
 * A product SKU may appear on more than one shelf (real stores repeat the same product
 * across many facings) but never twice on the *same* shelf face. Phase 2 places every
 * remaining catalog SKU at least once when bay capacity allows.
 */
export function fillPlanogramsForLayout(layout, products, categories) {
  let placements = 0;
  const loadCappedRef = { count: 0 };
  const categoryCursor = new Map();

  for (const raw of layout.shelves || []) {
    const shelf = normalizeShelf({ ...raw });
    for (const { faceId } of facesToFill(shelf)) {
      placements += fillFaceSlots({
        shelf,
        raw,
        faceId,
        products,
        categories,
        categoryCursor,
        loadCappedRef,
      });
    }
  }

  placements += fillRemainingCatalogProducts(layout, products, categories, loadCappedRef);

  if (loadCappedRef.count > 0) {
    console.log(
      JSON.stringify({
        level: "info",
        message: "planogram_autofill_load_capped",
        layoutId: layout?.id,
        cappedPlacements: loadCappedRef.count,
      })
    );
  }
  return placements;
}

export function loadProductsForLayoutVertical(vertical, listCategories, listProducts) {
  const categories = listCategoriesForLayout(vertical, listCategories);
  const catIds = new Set(categories.map((c) => c.id));
  return {
    categories,
    products: (listProducts() || []).filter((p) => {
      const resolved = resolveCategoryId(p.categoryId, categories);
      return catIds.has(resolved) || catIds.has(p.categoryId);
    }),
  };
}
