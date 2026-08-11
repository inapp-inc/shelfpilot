import assert from "node:assert/strict";
import test from "node:test";
import { packAislesAndShelves } from "../src/services/layoutPacker.js";
import { collectOverlapViolations, overlapsAnyShelf } from "../src/services/polygonContainment.js";

const HYPER = {
  widthMeters: 23.1,
  depthMeters: 15,
  shape: "polygon",
  polygon: [
    { x: 0, y: 0 },
    { x: 23.1, y: 0 },
    { x: 23.1, y: 15 },
    { x: 0, y: 15 },
  ],
};

const GONDOLA = {
  type: "gondola",
  usableWidthMeters: 1.8,
  depthMeters: 0.9,
  defaultLevels: 3,
};

for (const orientation of ["horizontal", "vertical", "mixed"]) {
  test(`walk aisles never overlap shelves (${orientation})`, () => {
    const packed = packAislesAndShelves(HYPER, {
      orientation,
      minAisleWidthMeters: 1.5,
      compactMode: true,
      fillRemaining: true,
      shelfTemplate: GONDOLA,
    });
    const layout = { ...HYPER, shelves: packed.shelves, aisles: packed.aisles };
    assert.equal(collectOverlapViolations(layout).length, 0);
    for (const a of packed.aisles) {
      assert.equal(overlapsAnyShelf(a, layout), null, `aisle ${a.id} must not cross fixtures`);
    }
    assert.ok(packed.aisles.length >= 2, "expected walk corridors between fixture rows");
  });
}
