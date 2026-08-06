/**
 * Auto-fill shelf planograms from catalog products matching each face category.
 */
import { randomUUID } from "node:crypto";
import { normalizeShelf, faceCategoryId, facePlanogram, syncLegacyFromFaces } from "./shelfFaces.js";
import { listCategoriesForLayout, productAllowedForShelf, resolveCategoryId } from "./categoryTree.js";
import { clampDepthFacings, previewFacings } from "./planogramMath.js";
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

/**
 * Trim facings so a level stays under its safe working load.
 * Depth is shed before width: pulling back the deep stack keeps the shopper-facing
 * presentation intact, which is what a merchandiser would do by hand.
 */
function fitToLoadLimit(facings, depthFacings, unitWeightKg, limitKg) {
  if (!Number.isFinite(unitWeightKg) || unitWeightKg <= 0) {
    return { facings, depthFacings, capped: false };
  }
  const maxUnits = unitsWithinLoad(limitKg, 0, unitWeightKg);
  if (!Number.isFinite(maxUnits) || facings * depthFacings <= maxUnits) {
    return { facings, depthFacings, capped: false };
  }
  if (maxUnits < 1) {
    return { facings: 1, depthFacings: 1, capped: true };
  }
  const fittedDepth = Math.max(1, Math.min(depthFacings, Math.floor(maxUnits / facings)));
  if (fittedDepth * facings <= maxUnits) {
    return { facings, depthFacings: fittedDepth, capped: true };
  }
  const fittedFacings = Math.max(1, Math.min(facings, Math.floor(maxUnits)));
  return { facings: fittedFacings, depthFacings: 1, capped: true };
}

/**
 * Fill planograms on all shelves; returns total placements added.
 * Each catalog product is placed at most once across the layout so remaining
 * SKUs stay available for other shelves (and show as missing until placed).
 */
export function fillPlanogramsForLayout(layout, products, categories) {
  let placements = 0;
  let loadCapped = 0;
  const usedProductIds = new Set();

  for (const raw of layout.shelves || []) {
    const shelf = normalizeShelf({ ...raw });
    const levelLoadLimit = levelLoadLimitKg(shelf);
    for (const { faceId } of facesToFill(shelf)) {
      const categoryId = faceCategoryId(shelf, faceId) || shelf.categoryId;
      if (!categoryId) continue;
      const candidates = candidatesForFace(products, shelf, faceId, categories);
      if (!candidates.length) continue;

      const pog = facePlanogram(shelf, faceId);
      pog.length = 0;

      const levels = shelfLevels(shelf);
      let candidateCursor = 0;
      for (const lv of levels) {
        const levelIndex = Number(lv.levelIndex) || 0;
        let placedOnLevel = false;

        for (let attempt = 0; attempt < candidates.length; attempt += 1) {
          const product = candidates[(candidateCursor + attempt) % candidates.length];
          if (usedProductIds.has(product.id)) continue;

          const preview = previewFacings({
            shelf: { ...shelf, categoryId },
            product,
            levelIndex,
            faceId,
          });
          if (!preview.maxFacings) continue;

          const segments = levelSegmentsList(shelf, faceId, levelIndex);
          const segmentId = segments[0]?.id;

          const maxDepthFacings = Math.max(1, preview.maxDepthFacings || 1);
          const fitted = fitToLoadLimit(
            preview.maxFacings,
            clampDepthFacings(null, maxDepthFacings),
            productWeightKg(product),
            levelLoadLimit
          );
          if (fitted.capped) loadCapped += 1;

          pog.push({
            id: `pog-${randomUUID().slice(0, 8)}`,
            productId: product.id,
            levelIndex,
            facings: fitted.facings,
            maxFacings: preview.maxFacings,
            depthFacings: fitted.depthFacings,
            maxDepthFacings,
            positionX: 0,
            faceId,
            segmentId: segmentId || undefined,
          });
          usedProductIds.add(product.id);
          candidateCursor = (candidateCursor + attempt + 1) % candidates.length;
          placements += 1;
          placedOnLevel = true;
          break;
        }

        if (!placedOnLevel) {
          // No unused matching SKU left for this category — leave the level empty
          // so other shelves/categories can still receive remaining catalog products.
          break;
        }
      }
    }
    syncLegacyFromFaces(shelf);
    Object.assign(raw, shelf);
  }
  if (loadCapped > 0) {
    console.log(
      JSON.stringify({
        level: "info",
        message: "planogram_autofill_load_capped",
        layoutId: layout?.id,
        cappedPlacements: loadCapped,
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
