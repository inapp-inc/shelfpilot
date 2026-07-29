import assert from "node:assert/strict";
import test from "node:test";
import { assignCategoryMix } from "../src/services/categoryMixPacker.js";
import { packAislesAndShelves } from "../src/services/layoutPacker.js";
import { normalizeShelf, nextDisplayNumber, facePlanogram, displayNumberToLetter, shelfFaceLabel, shelfUnitLabel, oppositeShelfOrigin, pairFaceId, assignDisplayNumbers } from "../src/services/shelfFaces.js";
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
  assert.equal(shelf.faces.length, 2);
  assert.equal(shelf.faces[0].categoryId, "grocery");
  assert.equal(shelf.planogram.length, 1);
  assert.equal(shelf.doubleSided, true);
});

test("plain shelf type normalizes as doubleSided with two faces", () => {
  const shelf = normalizeShelf({ id: "s2", type: "shelf" });
  assert.equal(shelf.doubleSided, true);
  assert.equal(shelf.faces.length, 2);
});

test("gondola normalizes as doubleSided with two faces", () => {
  const shelf = normalizeShelf({ id: "g1", type: "gondola" });
  assert.equal(shelf.doubleSided, true);
  assert.equal(shelf.faces.length, 2);
  assert.equal(shelf.faces[0].id, "A");
  assert.equal(shelf.faces[1].id, "B");
});

test("storage normalizes as doubleSided with two faces", () => {
  const shelf = normalizeShelf({ id: "st1", type: "storage" });
  assert.equal(shelf.doubleSided, true);
  assert.equal(shelf.faces.length, 2);
});

test("nextDisplayNumber increments from existing shelves", () => {
  assert.equal(nextDisplayNumber([{ displayNumber: 3 }, { displayNumber: 7 }]), 8);
  assert.equal(nextDisplayNumber([]), 1);
});

test("displayNumberToLetter maps 1-26 and beyond", () => {
  assert.equal(displayNumberToLetter(1), "A");
  assert.equal(displayNumberToLetter(2), "B");
  assert.equal(displayNumberToLetter(26), "Z");
  assert.equal(displayNumberToLetter(27), "AA");
});

test("shelfFaceLabel uses letter + face digit", () => {
  assert.equal(shelfFaceLabel(1, "A"), "A1");
  assert.equal(shelfFaceLabel(1, "B"), "A2");
  assert.equal(shelfFaceLabel(2, "A"), "B1");
  assert.equal(shelfFaceLabel(2, "B"), "B2");
  assert.equal(shelfUnitLabel(3), "C");
});

test("packAislesAndShelves assigns sequential displayNumber per front/back pair", () => {
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
  assert.ok(shelves.every((s) => s.pairId && (s.pairRole === "front" || s.pairRole === "back")));
  const byPair = new Map();
  for (const s of shelves) {
    if (!byPair.has(s.pairId)) byPair.set(s.pairId, []);
    byPair.get(s.pairId).push(s);
  }
  for (const mates of byPair.values()) {
    assert.equal(mates.length, 2);
    assert.equal(mates[0].displayNumber, mates[1].displayNumber);
  }
  const units = [...new Set(shelves.map((s) => s.displayNumber))].sort((a, b) => a - b);
  assert.deepEqual(units, Array.from({ length: byPair.size }, (_, i) => i + 1));
});

test("oppositeShelfOrigin places back shelf on same footprint facing +180°", () => {
  const opp = oppositeShelfOrigin(2, 3, 0, 1.2, 0.6);
  assert.equal(opp.rotationDeg, 180);
  assert.equal(opp.x, 3.2);
  assert.equal(opp.y, 3.6);
  assert.equal(pairFaceId({ pairRole: "front" }), "A");
  assert.equal(pairFaceId({ pairRole: "back" }), "B");
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
