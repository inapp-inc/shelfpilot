import assert from "node:assert/strict";
import test from "node:test";
import { packAislesAndShelves } from "../src/services/layoutPacker.js";
import { aisleFootprint } from "../src/services/polygonContainment.js";
import { countUnboundShelves, aisleOverlapArea, pruneCoincidentAisles } from "../src/services/aisleCoverage.js";

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

const L_SHAPE = {
  widthMeters: 20,
  depthMeters: 20,
  shape: "polygon",
  polygon: [
    { x: 0, y: 0 },
    { x: 12, y: 0 },
    { x: 12, y: 8 },
    { x: 20, y: 8 },
    { x: 20, y: 20 },
    { x: 0, y: 20 },
  ],
};

test("every shelf binds to a walk aisle after pack", () => {
  for (const layout of [RECT, L_SHAPE]) {
    for (const orientation of ["horizontal", "mixed"]) {
      const packed = packAislesAndShelves(layout, {
        orientation,
        minAisleWidthMeters: 1.2,
        compactMode: true,
        shelfTemplate: { type: "gondola", usableWidthMeters: 1.2, depthMeters: 0.6 },
      });
      const unbound = countUnboundShelves(packed.shelves);
      assert.equal(unbound, 0, `${orientation} pack should bind every shelf on ${layout.polygon.length}-gon`);
    }
  }
});

test("parallel aisles do not stack duplicate footprints", () => {
  const packed = packAislesAndShelves(RECT, {
    orientation: "horizontal",
    minAisleWidthMeters: 1.2,
    shelfTemplate: { type: "gondola", usableWidthMeters: 1.2, depthMeters: 0.6 },
  });
  const aisles = packed.aisles;
  for (let i = 0; i < aisles.length; i += 1) {
    for (let j = i + 1; j < aisles.length; j += 1) {
      if (aisles[i].orientation !== aisles[j].orientation) continue;
      const overlap = aisleOverlapArea(aisles[i], aisles[j], RECT);
      assert.ok(overlap < 0.05, "same-orientation aisles should not overlap heavily");
    }
  }
  for (const a of aisles) {
    const fp = aisleFootprint(a, RECT);
    assert.ok(fp.w > 0 && fp.d > 0, "aisle footprint must be positive");
  }
});

test("stacked aisles are pruned; T-junctions stay", () => {
  const stacked = [
    { id: "a", orientation: "vertical", x: 2, y: 1, widthMeters: 1.2, lengthMeters: 10, source: "auto" },
    { id: "b", orientation: "vertical", x: 2.15, y: 1.2, widthMeters: 1.2, lengthMeters: 9, source: "auto" },
    { id: "c", orientation: "horizontal", x: 1, y: 5, widthMeters: 1.2, lengthMeters: 8, source: "auto" },
  ];
  const kept = pruneCoincidentAisles(stacked, RECT);
  assert.equal(kept.length, 2);
  assert.ok(kept.some((a) => a.id === "a"));
  assert.ok(kept.some((a) => a.id === "c"));
  assert.ok(!kept.some((a) => a.id === "b"));
});

test("mixed pack does not stack aisles on top of each other", () => {
  const packed = packAislesAndShelves(RECT, {
    orientation: "mixed",
    minAisleWidthMeters: 1.2,
    mixedRandom: false,
    compactMode: true,
    shelfTemplate: { type: "gondola", usableWidthMeters: 1.2, depthMeters: 0.6 },
  });
  const aisles = packed.aisles;
  for (let i = 0; i < aisles.length; i += 1) {
    for (let j = i + 1; j < aisles.length; j += 1) {
      if (aisles[i].orientation !== aisles[j].orientation) continue;
      const overlap = aisleOverlapArea(aisles[i], aisles[j], RECT);
      assert.ok(overlap < 0.08, "same-orientation aisles must not stack");
    }
  }
});
