/**
 * Auto-fill shelf planograms from catalog products matching each face category.
 */
import { randomUUID } from "node:crypto";
import { normalizeShelf, faceCategoryId, facePlanogram, syncLegacyFromFaces } from "./shelfFaces.js";
import { listCategoriesForLayout, productAllowedForShelf, resolveCategoryId } from "./categoryTree.js";
import { previewFacings } from "./planogramMath.js";

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
 * Fill planograms on all shelves; returns total placements added.
 */
export function fillPlanogramsForLayout(layout, products, categories) {
  let placements = 0;
  for (const raw of layout.shelves || []) {
    const shelf = normalizeShelf({ ...raw });
    for (const { faceId } of facesToFill(shelf)) {
      const categoryId = faceCategoryId(shelf, faceId) || shelf.categoryId;
      if (!categoryId) continue;
      const candidates = candidatesForFace(products, shelf, faceId, categories);
      if (!candidates.length) continue;

      const pog = facePlanogram(shelf, faceId);
      pog.length = 0;

      const levels = shelfLevels(shelf);
      let productIdx = 0;
      for (const lv of levels) {
        const levelIndex = Number(lv.levelIndex) || 0;
        let guard = 0;
        while (guard < candidates.length * 3) {
          guard += 1;
          const product = candidates[productIdx % candidates.length];
          productIdx += 1;
          const preview = previewFacings({
            shelf: { ...shelf, categoryId },
            product,
            levelIndex,
            faceId,
          });
          if (!preview.maxFacings) continue;

          const alreadyOnLevel = pog.some(
            (p) => Number(p.levelIndex) === levelIndex && p.productId === product.id
          );
          if (alreadyOnLevel) break;

          pog.push({
            id: `pog-${randomUUID().slice(0, 8)}`,
            productId: product.id,
            levelIndex,
            facings: preview.maxFacings,
            maxFacings: preview.maxFacings,
            depthFacings: Math.min(1, preview.maxDepthFacings || 1),
            maxDepthFacings: preview.maxDepthFacings || 1,
            positionX: 0,
            faceId,
          });
          placements += 1;
          break;
        }
      }
    }
    syncLegacyFromFaces(shelf);
    Object.assign(raw, shelf);
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
