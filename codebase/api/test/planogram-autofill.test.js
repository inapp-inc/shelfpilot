import test from "node:test";
import assert from "node:assert/strict";
import { fillPlanogramsForLayout, loadProductsForLayoutVertical } from "../src/services/planogramAutoFill.js";
import { collectPlacedProductIds, computePlanogramCoverage } from "../src/services/planogramCoverage.js";
import { normalizeShelf } from "../src/services/shelfFaces.js";

const categories = [
  { id: "cat-grocery", name: "Grocery", vertical: "retail" },
  { id: "cat-dairy", name: "Dairy", vertical: "retail", parentId: "cat-grocery" },
];

const products = [
  {
    id: "prod-milk",
    name: "Whole Milk",
    sku: "MILK-1",
    categoryId: "cat-dairy",
    widthCm: 8,
    heightCm: 25,
    depthCm: 8,
  },
  {
    id: "prod-bread",
    name: "Sourdough",
    sku: "BRD-1",
    categoryId: "cat-grocery",
    widthCm: 15,
    heightCm: 20,
    depthCm: 10,
  },
  {
    id: "prod-unused",
    name: "Unused SKU",
    sku: "UNU-1",
    categoryId: "cat-grocery",
    widthCm: 10,
    heightCm: 10,
    depthCm: 10,
  },
];

test("fillPlanogramsForLayout places category-matched products on shelf levels", () => {
  const shelf = normalizeShelf({
    id: "s1",
    categoryId: "cat-dairy",
    usableWidthMeters: 1.2,
    depthMeters: 0.6,
    heightMeters: 2,
    defaultLevels: 2,
    faces: [
      { id: "A", categoryId: "cat-dairy", planogram: [] },
      { id: "B", categoryId: "cat-grocery", planogram: [] },
    ],
  });
  const layout = { vertical: "retail", shelves: [shelf] };
  const count = fillPlanogramsForLayout(layout, products, categories);
  assert.ok(count >= 2);
  const faceA = layout.shelves[0].faces.find((f) => f.id === "A");
  const faceB = layout.shelves[0].faces.find((f) => f.id === "B");
  assert.ok(faceA.planogram.some((p) => p.productId === "prod-milk"));
  assert.ok(faceB.planogram.some((p) => p.productId === "prod-bread" || p.productId === "prod-unused"));
});

test("computePlanogramCoverage reports missing catalog SKUs", () => {
  const layout = {
    vertical: "retail",
    shelves: [
      normalizeShelf({
        id: "s1",
        categoryId: "cat-dairy",
        doubleSided: false,
        planogram: [{ productId: "prod-milk", levelIndex: 0, facings: 1 }],
      }),
    ],
  };
  const placed = collectPlacedProductIds(layout);
  assert.equal(placed.has("prod-milk"), true);

  const coverage = computePlanogramCoverage(
    layout,
    (v) => categories.filter((c) => c.vertical === v),
    () => products
  );
  assert.equal(coverage.totalProducts, 3);
  assert.equal(coverage.placedCount, 1);
  assert.equal(coverage.missingCount, 2);
  assert.ok(coverage.missingProducts.some((p) => p.id === "prod-unused"));
});

test("fillPlanogramsForLayout places products on paired front/back gondola shelves", () => {
  const front = normalizeShelf({
    id: "s-front",
    pairId: "pair-1",
    pairRole: "front",
    categoryId: "cat-dairy",
    usableWidthMeters: 1.2,
    depthMeters: 0.6,
    heightMeters: 2,
    levels: [{ levelIndex: 0 }, { levelIndex: 1 }],
    faces: [{ id: "A", categoryId: "cat-dairy", planogram: [] }],
  });
  const back = normalizeShelf({
    id: "s-back",
    pairId: "pair-1",
    pairRole: "back",
    categoryId: "cat-grocery",
    usableWidthMeters: 1.2,
    depthMeters: 0.6,
    heightMeters: 2,
    levels: [{ levelIndex: 0 }, { levelIndex: 1 }],
    faces: [{ id: "A", categoryId: "cat-grocery", planogram: [] }],
  });
  const layout = { vertical: "retail", shelves: [front, back] };
  const count = fillPlanogramsForLayout(layout, products, categories);
  assert.ok(count >= 2);
  assert.ok(layout.shelves[0].faces[0].planogram.some((p) => p.productId === "prod-milk"));
  assert.ok(
    layout.shelves[1].faces[0].planogram.some(
      (p) => p.productId === "prod-bread" || p.productId === "prod-unused"
    )
  );
});

test("fillPlanogramsForLayout places each product on at most one shelf", () => {
  const makeShelf = (id, categoryId) =>
    normalizeShelf({
      id,
      categoryId,
      usableWidthMeters: 1.2,
      depthMeters: 0.6,
      heightMeters: 2,
      defaultLevels: 2,
      faces: [{ id: "A", categoryId, planogram: [{ productId: "stale", levelIndex: 0 }] }],
    });
  const layout = {
    vertical: "retail",
    shelves: [
      makeShelf("s1", "cat-dairy"),
      makeShelf("s2", "cat-dairy"),
      makeShelf("s3", "cat-grocery"),
      makeShelf("s4", "cat-grocery"),
    ],
  };
  fillPlanogramsForLayout(layout, products, categories);
  const ids = [];
  for (const shelf of layout.shelves) {
    for (const face of shelf.faces || []) {
      for (const p of face.planogram || []) ids.push(p.productId);
    }
  }
  assert.equal(new Set(ids).size, ids.length, `duplicate placements: ${ids.join(",")}`);
  assert.ok(ids.includes("prod-milk"));
  assert.ok(ids.includes("prod-bread") || ids.includes("prod-unused"));
  // Only one dairy SKU in catalog → second dairy shelf stays empty for other products elsewhere
  assert.equal(layout.shelves[1].faces[0].planogram.length, 0);
});

test("loadProductsForLayoutVertical resolves legacy category aliases", () => {
  const legacyProducts = [{ id: "p1", categoryId: "grocery", name: "Legacy" }];
  const { products: loaded } = loadProductsForLayoutVertical(
    "retail",
    () => categories,
    () => legacyProducts
  );
  assert.equal(loaded.length, 1);
});
