import assert from "node:assert/strict";
import test from "node:test";
import { packAislesAndShelves } from "../src/services/layoutPacker.js";
import { assignCategoryMix } from "../src/services/categoryMixPacker.js";
import { applyFixtureTypesToShelves } from "../src/services/categoryFixtureDefaults.js";

const RECT = {
  widthMeters: 14,
  depthMeters: 12,
  shape: "polygon",
  polygon: [
    { x: 0, y: 0 },
    { x: 14, y: 0 },
    { x: 14, y: 12 },
    { x: 0, y: 12 },
  ],
};

const CATEGORIES = [
  { id: "cat-a", name: "Grocery", vertical: "retail", color: "#A30A2A" },
  { id: "cat-b", name: "Fresh produce", vertical: "retail", color: "#16a34a" },
];

test("autogen pipeline preserves pairId through category mix and fixture typing", () => {
  const packed = packAislesAndShelves(RECT, {
    orientation: "horizontal",
    minAisleWidthMeters: 1.2,
    shelfTemplate: { type: "gondola", usableWidthMeters: 1.2, depthMeters: 0.6 },
  });
  const mix = [
    { categoryId: "cat-a", percent: 50 },
    { categoryId: "cat-b", percent: 50 },
  ];
  const assigned = assignCategoryMix(packed.shelves, mix, CATEGORIES);
  const typed = applyFixtureTypesToShelves(assigned.shelves, mix, CATEGORIES, {
    fixtureTemplates: [
      { type: "gondola", defaultWidthMeters: 1.2, defaultDepthMeters: 0.6, defaultHeightMeters: 2 },
      { type: "storage", defaultWidthMeters: 1.2, defaultDepthMeters: 0.6, defaultHeightMeters: 2 },
    ],
  });

  const pairs = new Map();
  for (const s of typed) {
    assert.ok(s.pairId, "pairId preserved after fixture typing");
    assert.equal(s.doubleSided, false);
    if (!pairs.has(s.pairId)) pairs.set(s.pairId, {});
    pairs.get(s.pairId)[s.pairRole] = s;
  }

  for (const [, pair] of pairs) {
    assert.ok(pair.front && pair.back, "each pair has front and back");
    assert.equal(pair.front.displayNumber, pair.back.displayNumber);
    assert.ok(pair.front.categoryId || pair.front.faces?.[0]?.categoryId);
    assert.ok(pair.back.categoryId || pair.back.faces?.[0]?.categoryId);
  }
});
