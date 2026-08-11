process.env.NODE_ENV = "test";
process.env.SQLITE_PATH = ":memory:";

import test from "node:test";
import assert from "node:assert/strict";
import {
  clampFacings,
  clampDepthFacings,
  clampStackLayers,
  computeMaxFacings,
  computeMaxStackLayers,
  computeSuggestedDepthFacings,
  computeSuggestedLevels,
  placementUnitCount,
  previewFacings,
} from "../src/services/planogramMath.js";
import { fixtureToShelf, normalizeLayout } from "../src/services/layoutNormalize.js";

test("computeMaxFacings floors usable / product width with FR-BUF-01 buffer", () => {
  assert.equal(computeMaxFacings(1.2, 0.2), 5);
  assert.equal(computeMaxFacings(1.0, 0.25), 3);
});

test("clampDepthFacings clamps to max depth", () => {
  assert.equal(clampDepthFacings(9, 3), 3);
  assert.equal(clampDepthFacings(null, 2), 2);
});

test("suggestedLevels from heights", () => {
  assert.equal(computeSuggestedLevels(2.0, 0.4), 5);
});

test("suggestedDepthFacings from depths with lateral buffer", () => {
  assert.equal(computeSuggestedDepthFacings(0.6, 0.2), 2);
});

test("normalize synthesizes shelves from fixtures", () => {
  const layout = normalizeLayout({
    fixtures: [{ id: "fx1", type: "shelf", widthMeters: 1.2, depthMeters: 0.6, heightMeters: 2, x: 1, y: 2 }],
    aisles: [],
    mappings: [{ fixtureId: "fx1", categoryId: "otc", color: "#0ea5e9" }],
  });
  assert.equal(layout.shelves.length, 1);
  assert.equal(layout.shelves[0].id, "fx1");
  assert.equal(layout.shelves[0].usableWidthMeters, 1.2);
  assert.equal(layout.shelfMappings.length, 1);
});

test("fixtureToShelf copies planogram and levels", () => {
  const s = fixtureToShelf({
    id: "a",
    widthMeters: 1,
    depthMeters: 0.5,
    heightMeters: 2,
    x: 0,
    y: 0,
    levels: [{ levelIndex: 0, heightFromFloorMeters: 0.4, clearanceMeters: 0.3 }],
    planogram: [],
  });
  assert.equal(s.levels.length, 1);
});

test("previewFacings returns assumedDimensions when attrs missing", () => {
  const preview = previewFacings({
    shelf: { id: "s1", usableWidthMeters: 1.2, heightMeters: 2 },
    product: { id: "p1", attributes: {} },
  });
  assert.equal(preview.maxFacings, 5);
  assert.equal(preview.assumedDimensions, true);
});

test("computeMaxStackLayers and placementUnitCount", () => {
  assert.equal(computeMaxStackLayers(0.8, 0.25), 3);
  assert.equal(
    placementUnitCount({ facings: 4, depthFacings: 5, stackLayers: 2 }),
    40
  );
  assert.equal(clampStackLayers(4, 2), 2);
});
