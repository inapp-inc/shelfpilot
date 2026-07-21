import assert from "node:assert/strict";
import test from "node:test";
import { assignCategoryMix } from "../src/services/categoryMixPacker.js";
import { packAislesAndShelves } from "../src/services/layoutPacker.js";
import { normalizeShelf, nextDisplayNumber, facePlanogram } from "../src/services/shelfFaces.js";
import { fixtureToShelf, normalizeLayout } from "../src/services/layoutNormalize.js";
import { collectContainmentViolations } from "../src/services/polygonContainment.js";

test("normalizeShelf synthesizes Face A from legacy categoryId", () => {
  const shelf = normalizeShelf({
    id: "s1",
    type: "shelf",
    categoryId: "grocery",
    color: "#16a34a",
    planogram: [{ id: "p1", productId: "prod-1", levelIndex: 0, facings: 2, maxFacings: 6 }],
  });
  assert.equal(shelf.faces.length, 1);
  assert.equal(shelf.faces[0].categoryId, "grocery");
  assert.equal(shelf.planogram.length, 1);
  assert.equal(shelf.doubleSided, false);
});

test("gondola normalizes as doubleSided with two faces", () => {
  const shelf = normalizeShelf({ id: "g1", type: "gondola" });
  assert.equal(shelf.doubleSided, true);
  assert.equal(shelf.faces.length, 2);
  assert.equal(shelf.faces[0].id, "A");
  assert.equal(shelf.faces[1].id, "B");
});

test("nextDisplayNumber increments from existing shelves", () => {
  assert.equal(nextDisplayNumber([{ displayNumber: 3 }, { displayNumber: 7 }]), 8);
  assert.equal(nextDisplayNumber([]), 1);
});

test("packAislesAndShelves assigns sequential displayNumber", () => {
  const layout = {
    widthMeters: 12,
    depthMeters: 10,
    shape: "polygon",
    polygon: [
      { x: 0, y: 0 },
      { x: 12, y: 0 },
      { x: 12, y: 10 },
      { x: 0, y: 10 },
    ],
  };
  const { shelves } = packAislesAndShelves(layout, { minAisleWidthMeters: 1.2 });
  assert.ok(shelves.length >= 2);
  const nums = shelves.map((s) => s.displayNumber).sort((a, b) => a - b);
  assert.deepEqual(nums, Array.from({ length: shelves.length }, (_, i) => i + 1));
});

test("assignCategoryMix creates dual faces on gondola shelves", () => {
  const shelves = [
    { id: "g1", type: "gondola", doubleSided: true, faces: [{ id: "A" }, { id: "B" }] },
    { id: "g2", type: "gondola", doubleSided: true, faces: [{ id: "A" }, { id: "B" }] },
  ];
  const categories = [
    { id: "fresh-produce", color: "#22c55e" },
    { id: "grocery", color: "#16a34a" },
    { id: "chilled", color: "#0ea5e9" },
  ];
  const mix = [
    { categoryId: "fresh-produce", percent: 50 },
    { categoryId: "grocery", percent: 50 },
  ];
  const { shelves: out } = assignCategoryMix(shelves, mix, categories);
  assert.equal(out[0].faces[0].categoryId, "fresh-produce");
  assert.ok(out[0].faces[1].categoryId);
  assert.notEqual(out[0].faces[0].categoryId, out[0].faces[1].categoryId);
});

test("facePlanogram stores placements per face", () => {
  const shelf = normalizeShelf({ id: "g1", type: "gondola" });
  const pogB = facePlanogram(shelf, "B");
  pogB.push({ id: "p1", productId: "x", levelIndex: 0, facings: 1, maxFacings: 4 });
  assert.equal(facePlanogram(shelf, "A").length, 0);
  assert.equal(facePlanogram(shelf, "B").length, 1);
});

test("L-shaped polygon autogen has zero containment violations", () => {
  const layout = {
    widthMeters: 20,
    depthMeters: 20,
    shape: "polygon",
    polygon: [
      { x: 0, y: 0 },
      { x: 10, y: 0 },
      { x: 10, y: 10 },
      { x: 20, y: 10 },
      { x: 20, y: 20 },
      { x: 0, y: 20 },
    ],
  };
  const { shelves, aisles, skippedOutsideCount } = packAislesAndShelves(layout, {
    minAisleWidthMeters: 1.2,
    shelfTemplate: { type: "gondola" },
  });
  layout.shelves = shelves;
  layout.aisles = aisles;
  normalizeLayout(layout);
  const violations = collectContainmentViolations(layout);
  assert.equal(violations.length, 0);
  assert.ok(typeof skippedOutsideCount === "number");
});

test("fixtureToShelf preserves displayNumber", () => {
  const shelf = fixtureToShelf({ id: "s1", type: "shelf", displayNumber: 5, usableWidthMeters: 1.2, depthMeters: 0.6, x: 1, y: 1 });
  assert.equal(shelf.displayNumber, 5);
});
