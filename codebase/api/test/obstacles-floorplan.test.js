import test from "node:test";
import assert from "node:assert/strict";
import { normalizeObstacle, obstacleAreaSqm, totalObstacleAreaSqm } from "../src/services/obstacles.js";
import { normalizeFloorPlan, patchFloorPlan } from "../src/services/floorPlan.js";
import { computeSpaceUtilization } from "../src/services/analyticsReports.js";
import {
  assertNoOverlapOrThrow,
  entityInsideLayout,
  overlapsAnyObstacle,
} from "../src/services/polygonContainment.js";

const SQUARE = {
  widthMeters: 10,
  depthMeters: 10,
  shape: "polygon",
  polygon: [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 },
  ],
};

test("normalizeObstacle applies type defaults", () => {
  const column = normalizeObstacle({ type: "column", x: 2, y: 2 });
  assert.equal(column.type, "column");
  assert.equal(column.name, "Column");
  assert.equal(column.widthMeters, 0.4);
  assert.equal(column.depthMeters, 0.4);
  assert.ok(column.id.startsWith("obs-"));

  const unknown = normalizeObstacle({ type: "banana" });
  assert.equal(unknown.type, "column");
});

test("obstacle area sums across the layout", () => {
  const layout = {
    obstacles: [
      normalizeObstacle({ type: "column", widthMeters: 1, depthMeters: 1 }),
      normalizeObstacle({ type: "wall", widthMeters: 4, depthMeters: 0.5 }),
    ],
  };
  assert.equal(obstacleAreaSqm(layout.obstacles[0]), 1);
  assert.equal(totalObstacleAreaSqm(layout), 3);
});

test("obstacles are removed from usable area and shown in the breakdown", () => {
  const layout = {
    ...SQUARE,
    shelves: [{ id: "s1", widthMeters: 2, depthMeters: 5 }],
    obstacles: [normalizeObstacle({ type: "column", x: 1, y: 1, widthMeters: 2, depthMeters: 2 })],
  };
  const space = computeSpaceUtilization(layout);
  assert.equal(space.totalStoreAreaSqm, 100);
  assert.equal(space.obstacleAreaSqm, 4);
  assert.equal(space.usableStoreAreaSqm, 96);
  // 10 m² of fixtures against 96 m² of usable floor
  assert.equal(space.utilizationPercent, 10.4);
  assert.ok(space.breakdown.some((b) => b.key === "obstacles" && b.areaSqm === 4));
});

test("overcounted aisle strips do not erase vacant floor", () => {
  // Many duplicate corridor scans that would sum past the store if naively added.
  const layout = {
    ...SQUARE,
    shelves: [{ id: "s1", widthMeters: 2, depthMeters: 2, x: 1, y: 1 }],
    aisles: Array.from({ length: 12 }, (_, i) => ({
      id: `a${i}`,
      orientation: "horizontal",
      x: 0,
      y: 4,
      widthMeters: 1.2,
      lengthMeters: 10,
    })),
  };
  const space = computeSpaceUtilization(layout);
  assert.ok(space.unusedAreaSqm > 20, `expected vacant floor, got unused=${space.unusedAreaSqm}`);
  assert.ok(space.vacancyPercent > 20);
  assert.ok(space.utilizationPercent < 20);
  assert.ok(space.aisleAreaSqm < 50, `aisle should be capped, got ${space.aisleAreaSqm}`);
});

test("a gondola pair is counted as one floor footprint", () => {
  const shared = { widthMeters: 2, depthMeters: 1, pairId: "pair-1" };
  const layout = {
    ...SQUARE,
    shelves: [
      { id: "front", ...shared, pairRole: "front" },
      { id: "back", ...shared, pairRole: "back" },
    ],
  };
  const space = computeSpaceUtilization(layout);
  // Both records share one 2 × 1 footprint, so 2 m² not 4 m².
  assert.equal(space.allocatedAreaSqm, 2);
});

test("obstacle containment uses its rectangle footprint", () => {
  const inside = normalizeObstacle({ x: 4, y: 4, widthMeters: 1, depthMeters: 1 });
  const outside = normalizeObstacle({ x: 9.5, y: 9.5, widthMeters: 2, depthMeters: 2 });
  assert.equal(entityInsideLayout(inside, "obstacle", SQUARE), true);
  assert.equal(entityInsideLayout(outside, "obstacle", SQUARE), false);
});

test("a shelf overlapping a column is detected", () => {
  const layout = {
    ...SQUARE,
    obstacles: [normalizeObstacle({ type: "column", x: 3, y: 3, widthMeters: 1, depthMeters: 1 })],
  };
  const clash = { id: "s1", x: 2.5, y: 2.5, usableWidthMeters: 2, depthMeters: 2, rotationDeg: 0 };
  const clear = { id: "s2", x: 6, y: 6, usableWidthMeters: 2, depthMeters: 1, rotationDeg: 0 };
  assert.ok(overlapsAnyObstacle(clash, layout));
  assert.equal(overlapsAnyObstacle(clear, layout), null);
});

test("an obstacle cannot be dropped on top of an existing fixture", () => {
  const layout = {
    ...SQUARE,
    shelves: [{ id: "s1", x: 2, y: 2, usableWidthMeters: 2, depthMeters: 1, rotationDeg: 0 }],
  };
  const onFixture = normalizeObstacle({ type: "column", x: 2.5, y: 2.1, widthMeters: 0.4, depthMeters: 0.4 });
  assert.throws(() => assertNoOverlapOrThrow(onFixture, "obstacle", layout), /overlap_violation/);

  const clear = normalizeObstacle({ type: "column", x: 7, y: 7, widthMeters: 0.4, depthMeters: 0.4 });
  assert.doesNotThrow(() => assertNoOverlapOrThrow(clear, "obstacle", layout));
});

test("floor plan normalizes calibration and ignores an entry with no image", () => {
  assert.equal(normalizeFloorPlan(null), null);
  assert.equal(normalizeFloorPlan({ widthMeters: 10 }), null);

  const plan = normalizeFloorPlan({ url: "/floor-plans/a.png", widthMeters: 12, opacity: 5 });
  assert.equal(plan.widthMeters, 12);
  assert.equal(plan.depthMeters, 8);
  assert.equal(plan.opacity, 1);
  assert.equal(plan.visible, true);
});

test("patchFloorPlan updates only the supplied calibration fields", () => {
  const plan = normalizeFloorPlan({ url: "/floor-plans/a.png", widthMeters: 12, depthMeters: 9 });
  const patched = patchFloorPlan(plan, { opacity: 0.2, visible: false });
  assert.equal(patched.widthMeters, 12);
  assert.equal(patched.depthMeters, 9);
  assert.equal(patched.opacity, 0.2);
  assert.equal(patched.visible, false);
});
