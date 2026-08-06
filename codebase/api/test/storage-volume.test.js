import test from "node:test";
import assert from "node:assert/strict";
import {
  computeCategoryVolumeAllocation,
  computeStorageVolume,
  faceDepthMeters,
  faceStorageVolumeM3,
  levelClearHeights,
  productVolumeM3,
} from "../src/services/volumeMath.js";
import { normalizeShelf } from "../src/services/shelfFaces.js";

const categories = [
  { id: "cat-a", name: "Ambient", color: "#111" },
  { id: "cat-b", name: "Chilled", color: "#222" },
];

/** 0.2 × 0.25 × 0.2 m = 0.01 m³ per unit. */
const products = [
  {
    id: "p-a",
    name: "Box A",
    categoryId: "cat-a",
    attributes: { widthMeters: 0.2, heightMeters: 0.25, depthMeters: 0.2 },
  },
  {
    id: "p-b",
    name: "Box B",
    categoryId: "cat-b",
    attributes: { widthMeters: 0.2, heightMeters: 0.25, depthMeters: 0.2 },
  },
];

test("level clear height is the gap to the next level less the board", () => {
  const shelf = {
    heightMeters: 2,
    levels: [
      { levelIndex: 0, heightFromFloorMeters: 0.3 },
      { levelIndex: 1, heightFromFloorMeters: 0.9 },
    ],
  };
  const heights = levelClearHeights(shelf);
  assert.equal(heights.length, 2);
  // 0.9 - 0.3 - 0.03 board
  assert.equal(heights[0].clearHeightMeters, 0.57);
  // top level runs to the top of the unit: 2 - 0.9 - 0.03
  assert.equal(heights[1].clearHeightMeters, 1.07);
});

test("a single-sided shelf merchandises its full depth", () => {
  const shelf = normalizeShelf({
    id: "s1",
    categoryId: "cat-a",
    doubleSided: false,
    usableWidthMeters: 1.2,
    depthMeters: 0.6,
    heightMeters: 2,
    faces: [{ id: "A", categoryId: "cat-a", planogram: [] }],
  });
  assert.equal(faceDepthMeters(shelf), 0.6);
});

test("a shelf merchandised from both sides splits its depth per face", () => {
  const shelf = normalizeShelf({
    id: "s2",
    usableWidthMeters: 1.2,
    depthMeters: 0.6,
    heightMeters: 2,
    faces: [
      { id: "A", categoryId: "cat-a", planogram: [] },
      { id: "B", categoryId: "cat-b", planogram: [] },
    ],
  });
  assert.equal(faceDepthMeters(shelf), 0.3);
});

test("an unmapped second face does not inflate capacity", () => {
  const oneSide = normalizeShelf({
    id: "s3",
    usableWidthMeters: 1.2,
    depthMeters: 0.6,
    heightMeters: 2,
    levels: [{ levelIndex: 0, heightFromFloorMeters: 0.3 }],
    faces: [
      { id: "A", categoryId: "cat-a", planogram: [] },
      { id: "B", categoryId: null, planogram: [] },
    ],
  });
  const layout = { shelves: [oneSide] };
  const volume = computeStorageVolume(layout, products);
  // 1.2 wide × 0.6 deep × (2 - 0.3 - 0.03) clear = 1.2024 m³, counted once
  assert.equal(volume.availableVolumeM3, 1.202);
});

test("gondola pair halves depth per record so the unit is not double counted", () => {
  const base = {
    usableWidthMeters: 1.2,
    depthMeters: 0.6,
    heightMeters: 2,
    levels: [{ levelIndex: 0, heightFromFloorMeters: 0.3 }],
  };
  const front = normalizeShelf({
    ...base,
    id: "front",
    pairId: "pair-1",
    pairRole: "front",
    categoryId: "cat-a",
    faces: [{ id: "A", categoryId: "cat-a", planogram: [] }],
  });
  const back = normalizeShelf({
    ...base,
    id: "back",
    pairId: "pair-1",
    pairRole: "back",
    categoryId: "cat-b",
    faces: [{ id: "A", categoryId: "cat-b", planogram: [] }],
  });

  // Each half claims 0.3 m of the 0.6 m physical depth.
  assert.equal(faceDepthMeters(front), 0.3);
  const total = faceStorageVolumeM3(front) + faceStorageVolumeM3(back);
  // Equals one 1.2 × 0.6 × 1.67 unit rather than two.
  assert.ok(Math.abs(total - 1.2 * 0.6 * 1.67) < 1e-6);
});

test("used volume counts wide facings times deep facings", () => {
  assert.equal(Number(productVolumeM3(products[0]).toFixed(4)), 0.01);
  const shelf = normalizeShelf({
    id: "s4",
    categoryId: "cat-a",
    doubleSided: false,
    usableWidthMeters: 1.2,
    depthMeters: 0.6,
    heightMeters: 2,
    levels: [{ levelIndex: 0, heightFromFloorMeters: 0.3 }],
    faces: [
      {
        id: "A",
        categoryId: "cat-a",
        planogram: [{ id: "pog1", productId: "p-a", levelIndex: 0, facings: 6, depthFacings: 3 }],
      },
    ],
  });
  const volume = computeStorageVolume({ shelves: [shelf] }, products);
  // 0.01 m³ × 6 wide × 3 deep
  assert.equal(volume.usedVolumeM3, 0.18);
  assert.ok(volume.fillPercent > 0 && volume.fillPercent < 100);
});

test("category volume allocation attributes each face to its own category", () => {
  const shelf = normalizeShelf({
    id: "s5",
    usableWidthMeters: 1.2,
    depthMeters: 0.6,
    heightMeters: 2,
    levels: [{ levelIndex: 0, heightFromFloorMeters: 0.3 }],
    faces: [
      { id: "A", categoryId: "cat-a", planogram: [] },
      { id: "B", categoryId: "cat-b", planogram: [] },
    ],
  });
  const alloc = computeCategoryVolumeAllocation({ shelves: [shelf] }, categories, products);
  assert.equal(alloc.rows.length, 2);
  for (const row of alloc.rows) {
    assert.equal(row.volumeSharePercent, 50);
  }
});
