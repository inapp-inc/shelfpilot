import test from "node:test";
import assert from "node:assert/strict";
import {
  focusGroupFor,
  spatialFocusGroupFor,
  shelfUnitContainsPhysicalId,
  shelfUnitInFocusGroup,
  SHELF_3D_GROUP_SIZE,
} from "../../web/src/layout-editor/shelfFocusGroup.js";

const layout = {
  aisles: [{ id: "a1", aisleNumber: 1 }],
  shelves: [
    { id: "s1", aisleId: "a1", shelfIndexAlongAisle: 0 },
    { id: "s2", aisleId: "a1", shelfIndexAlongAisle: 1 },
    { id: "s3", aisleId: "a1", shelfIndexAlongAisle: 2 },
    { id: "s4", aisleId: "a1", shelfIndexAlongAisle: 3 },
    { id: "s5", aisleId: "a1", shelfIndexAlongAisle: 4 },
  ],
};

test("focusGroupFor returns a three-wide window around the target shelf", () => {
  const mid = focusGroupFor(layout, "s3");
  assert.deepEqual(mid.physicalShelfIds, ["s2", "s3", "s4"]);

  const first = focusGroupFor(layout, "s1");
  assert.deepEqual(first.physicalShelfIds, ["s1", "s2", "s3"]);

  const last = focusGroupFor(layout, "s5");
  assert.deepEqual(last.physicalShelfIds, ["s3", "s4", "s5"]);
});

test("focusGroupFor handles a single shelf on an aisle", () => {
  const solo = {
    aisles: [{ id: "a9", aisleNumber: 9 }],
    shelves: [{ id: "only", aisleId: "a9", shelfIndexAlongAisle: 0 }],
  };
  const group = focusGroupFor(solo, "only");
  assert.deepEqual(group.physicalShelfIds, ["only"]);
});

test("spatialFocusGroupFor finds colinear neighbors without aisle binding", () => {
  const loose = {
    shelves: [
      { id: "s1", x: 0, y: 0, widthMeters: 1.2, depthMeters: 0.6, rotationDeg: 0 },
      { id: "s2", x: 1.3, y: 0, widthMeters: 1.2, depthMeters: 0.6, rotationDeg: 0 },
      { id: "s3", x: 2.6, y: 0, widthMeters: 1.2, depthMeters: 0.6, rotationDeg: 0 },
      { id: "s4", x: 3.9, y: 0, widthMeters: 1.2, depthMeters: 0.6, rotationDeg: 0 },
      { id: "far", x: 0, y: 4, widthMeters: 1.2, depthMeters: 0.6, rotationDeg: 0 },
    ],
  };
  assert.deepEqual(spatialFocusGroupFor(loose, "s2"), ["s1", "s2", "s3"]);
  assert.deepEqual(focusGroupFor(loose, "s2").physicalShelfIds, ["s1", "s2", "s3"]);
});

test("shelfUnitInFocusGroup matches physical ids on merged units", () => {
  const unit = { id: "merged", pairDisplay: true, pairShelfIds: { front: "s2", back: "x2" } };
  assert.equal(shelfUnitContainsPhysicalId(unit, "s2"), true);
  assert.equal(shelfUnitInFocusGroup(unit, ["s2", "s3", "s4"]), true);
  assert.equal(SHELF_3D_GROUP_SIZE, 3);
});
