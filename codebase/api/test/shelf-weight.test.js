import test from "node:test";
import assert from "node:assert/strict";
import {
  computeShelfLoad,
  computeWeightLoadReport,
  levelLoadLimitKg,
  placementWeightKg,
  productWeightKg,
  shelfLoadLimitKg,
  unitsWithinLoad,
} from "../src/services/weightMath.js";
import { fillPlanogramsForLayout } from "../src/services/planogramAutoFill.js";
import { normalizeShelf } from "../src/services/shelfFaces.js";

const categories = [{ id: "cat-a", name: "Ambient", vertical: "retail" }];

function shelfWith(planogram, overrides = {}) {
  return normalizeShelf({
    id: "s1",
    type: "shelf",
    categoryId: "cat-a",
    doubleSided: false,
    usableWidthMeters: 1.2,
    depthMeters: 0.6,
    heightMeters: 2,
    levels: [{ levelIndex: 0, heightFromFloorMeters: 0.3 }],
    faces: [{ id: "A", categoryId: "cat-a", planogram }],
    ...overrides,
  });
}

test("product weight reads kg, grams, and pounds", () => {
  assert.equal(productWeightKg({ attributes: { weightKg: 2.5 } }), 2.5);
  assert.equal(productWeightKg({ attributes: { weightGrams: 500 } }), 0.5);
  assert.ok(Math.abs(productWeightKg({ attributes: { weightLb: 10 } }) - 4.5359237) < 1e-6);
  assert.equal(productWeightKg({ attributes: {} }), 0);
});

test("fixture load limits fall back to type defaults", () => {
  assert.equal(levelLoadLimitKg({ type: "shelf" }), 80);
  assert.equal(levelLoadLimitKg({ type: "rack" }), 150);
  assert.equal(levelLoadLimitKg({ type: "shelf", maxLoadKgPerLevel: 45 }), 45);
  // Total limit divided across levels when only a total is given.
  assert.equal(levelLoadLimitKg({ type: "shelf", maxLoadKg: 200, levels: [{ levelIndex: 0 }, { levelIndex: 1 }] }), 100);
  assert.equal(shelfLoadLimitKg({ type: "shelf", levels: [{ levelIndex: 0 }, { levelIndex: 1 }] }), 160);
});

test("placement weight multiplies unit weight by wide and deep facings", () => {
  const product = { id: "p1", attributes: { weightKg: 2 } };
  assert.equal(placementWeightKg({ facings: 6, depthFacings: 3 }, product), 36);
});

test("unitsWithinLoad is unbounded when weight is unknown", () => {
  assert.equal(unitsWithinLoad(80, 0, 0), Infinity);
  assert.equal(unitsWithinLoad(80, 0, 2), 40);
  assert.equal(unitsWithinLoad(80, 80, 2), 0);
});

test("computeShelfLoad flags an overloaded level", () => {
  const products = [{ id: "p1", attributes: { weightKg: 5 } }];
  const shelf = shelfWith([{ id: "pog1", productId: "p1", levelIndex: 0, facings: 6, depthFacings: 3 }]);
  const load = computeShelfLoad(shelf, products);
  // 5 kg × 18 units = 90 kg against an 80 kg shelf limit
  assert.equal(load.levels[0].loadKg, 90);
  assert.equal(load.levels[0].limitKg, 80);
  assert.equal(load.levels[0].overloaded, true);
  assert.equal(load.weighed, true);
});

test("a level with no weight data is not reported as overloaded", () => {
  const products = [{ id: "p1", attributes: {} }];
  const shelf = shelfWith([{ id: "pog1", productId: "p1", levelIndex: 0, facings: 6, depthFacings: 3 }]);
  const load = computeShelfLoad(shelf, products);
  assert.equal(load.levels[0].loadKg, 0);
  assert.equal(load.levels[0].overloaded, false);
  assert.equal(load.weighed, false);
});

test("weight report totals load and lists overloaded shelves", () => {
  const products = [{ id: "p1", attributes: { weightKg: 5 } }, { id: "p2", attributes: {} }];
  const shelf = shelfWith([{ id: "pog1", productId: "p1", levelIndex: 0, facings: 6, depthFacings: 3 }]);
  const report = computeWeightLoadReport({ shelves: [shelf] }, products);
  assert.equal(report.totalLoadKg, 90);
  assert.equal(report.overloadedShelfCount, 1);
  assert.equal(report.productsMissingWeight, 1);
});

test("smart generate fills depth facings instead of a single row", () => {
  const products = [
    {
      id: "p-light",
      name: "Light",
      categoryId: "cat-a",
      attributes: { widthMeters: 0.2, heightMeters: 0.25, depthMeters: 0.2 },
    },
  ];
  const shelf = shelfWith([]);
  const layout = { vertical: "retail", shelves: [shelf] };
  fillPlanogramsForLayout(layout, products, categories);
  const placement = layout.shelves[0].faces[0].planogram[0];
  assert.equal(placement.facings, 6);
  // 0.6 m of usable depth / 0.2 m product depth
  assert.equal(placement.depthFacings, 3);
  assert.equal(placement.maxDepthFacings, 3);
});

test("smart generate caps facings so a level stays under its load limit", () => {
  const products = [
    {
      id: "p-heavy",
      name: "Heavy",
      categoryId: "cat-a",
      attributes: { widthMeters: 0.2, heightMeters: 0.25, depthMeters: 0.2, weightKg: 10 },
    },
  ];
  const shelf = shelfWith([]);
  const layout = { vertical: "retail", shelves: [shelf] };
  fillPlanogramsForLayout(layout, products, categories);
  const placement = layout.shelves[0].faces[0].planogram[0];
  // 6 wide × 3 deep × 10 kg = 180 kg would blow the 80 kg limit; depth is shed first.
  assert.ok(placement.facings * placement.depthFacings * 10 <= 80);
  assert.equal(placement.facings, 6);
  assert.equal(placement.depthFacings, 1);
});
