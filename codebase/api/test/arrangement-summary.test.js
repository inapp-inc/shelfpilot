import test from "node:test";
import assert from "node:assert/strict";
import { computeArrangementSummary, computeShelfRows, countShelfBays } from "../src/services/arrangementSummary.js";

const DEMO = {
  widthMeters: 20,
  depthMeters: 12,
  shape: "polygon",
  polygon: [
    { x: 0, y: 0 },
    { x: 20, y: 0 },
    { x: 20, y: 12 },
    { x: 0, y: 12 },
  ],
  aisles: [
    { id: "a1", orientation: "horizontal", x: 0, y: 2, widthMeters: 1.5, lengthMeters: 20 },
    { id: "a2", orientation: "horizontal", x: 0, y: 6, widthMeters: 1.5, lengthMeters: 20 },
  ],
  shelves: [
    {
      id: "s1",
      pairId: "p1",
      pairRole: "front",
      x: 1,
      y: 3.5,
      usableWidthMeters: 1.8,
      depthMeters: 0.9,
      heightMeters: 2,
      rotationDeg: 0,
      levels: [{}, {}, {}],
      faces: [{ id: "A", planogram: [] }, { id: "B", planogram: [] }],
    },
    {
      id: "s1b",
      pairId: "p1",
      pairRole: "back",
      x: 1,
      y: 4.4,
      usableWidthMeters: 1.8,
      depthMeters: 0.9,
      heightMeters: 2,
      rotationDeg: 180,
      levels: [{}, {}, {}],
      faces: [{ id: "A", planogram: [] }],
    },
    {
      id: "s2",
      pairId: "p2",
      pairRole: "front",
      x: 4,
      y: 3.5,
      usableWidthMeters: 1.8,
      depthMeters: 0.9,
      heightMeters: 2,
      rotationDeg: 0,
      levels: [{}, {}],
      faces: [{ id: "A", planogram: [] }],
    },
    {
      id: "s3",
      pairId: "p3",
      pairRole: "front",
      x: 1,
      y: 7.5,
      usableWidthMeters: 1.8,
      depthMeters: 0.9,
      heightMeters: 2,
      rotationDeg: 0,
      levels: [{}, {}],
      faces: [{ id: "A", planogram: [] }],
    },
  ],
  obstacles: [],
  zones: [],
};

test("computeShelfRows clusters by centerline", () => {
  const rows = computeShelfRows(DEMO);
  assert.ok(rows.rowCount >= 2);
  assert.ok(rows.shelvesPerRow >= 1);
});

test("countShelfBays multiplies levels × faces", () => {
  const bays = countShelfBays(DEMO);
  assert.ok(bays >= 6);
});

test("computeArrangementSummary returns arrangement volume capacity and space", () => {
  const summary = computeArrangementSummary(DEMO, []);
  assert.equal(summary.accepted, false);
  assert.ok(summary.arrangement.totalShelves >= 3);
  assert.ok(summary.volume.availableVolumeM3 > 0);
  assert.equal(summary.volume.usedVolumeM3, 0);
  assert.ok(summary.capacity.maxProductQuantity > 0);
  assert.ok(summary.space.storeAreaSqm > 0);
  assert.ok(typeof summary.arrangement.fixtureUtilizationPercent === "number");
});

test("accepted flag mirrors layout.arrangementAcceptedAt", () => {
  const summary = computeArrangementSummary(
    { ...DEMO, arrangementAcceptedAt: "2026-08-07T00:00:00.000Z", arrangementAcceptedBy: "designer@test" },
    []
  );
  assert.equal(summary.accepted, true);
  assert.equal(summary.arrangementAcceptedBy, "designer@test");
});
