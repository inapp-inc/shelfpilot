import test from "node:test";
import assert from "node:assert/strict";
import { computeAnalytics } from "../src/services/layoutMath.js";

const categories = [
  { id: "cat-a", name: "Ambient", color: "#111" },
  { id: "cat-b", name: "Chilled", color: "#222" },
];

test("freeSpacePercent reflects fixture coverage of usable area", () => {
  const layout = {
    id: "L1",
    widthMeters: 10,
    depthMeters: 10, // 100 sqm footprint & usable (no polygon)
    aisles: [{ id: "ai1" }],
    shelves: [
      { id: "s1", widthMeters: 2, depthMeters: 5, categoryId: "cat-a" }, // 10 sqm
      { id: "s2", widthMeters: 2, depthMeters: 5, categoryId: "cat-b" }, // 10 sqm
    ],
  };
  const a = computeAnalytics(layout, categories);
  assert.equal(a.usableAreaSqm, 100);
  assert.equal(a.usedAreaSqm, 20);
  assert.equal(a.freeSpacePercent, 80); // 100 - 20%
  assert.equal(a.aisleCount, 1);
  assert.equal(a.fixtureCount, 2);
});

test("polygon area drives usable area when present", () => {
  const layout = {
    id: "L2",
    widthMeters: 10,
    depthMeters: 10,
    polygon: [
      { x: 0, y: 0 },
      { x: 6, y: 0 },
      { x: 6, y: 6 },
      { x: 0, y: 6 },
    ], // 36 sqm
    shelves: [{ id: "s1", widthMeters: 2, depthMeters: 3, categoryId: "cat-a" }], // 6 sqm
  };
  const a = computeAnalytics(layout, categories);
  assert.equal(a.usableAreaSqm, 36);
  assert.equal(a.freeSpacePercent, Number((100 - (6 / 36) * 100).toFixed(1)));
});

test("facings total and by-category from shelf faces", () => {
  const layout = {
    id: "L3",
    widthMeters: 10,
    depthMeters: 10,
    shelves: [
      {
        id: "s1",
        widthMeters: 2,
        depthMeters: 1,
        faces: [
          { id: "A", categoryId: "cat-a", planogram: [{ id: "p1", facings: 3 }, { id: "p2", facings: 2 }] },
          { id: "B", categoryId: "cat-b", planogram: [{ id: "p3", facings: 4 }] },
        ],
      },
    ],
  };
  const a = computeAnalytics(layout, categories);
  assert.equal(a.facingsTotal, 9);
  const byId = Object.fromEntries(a.facingsByCategory.map((r) => [r.categoryId, r.facings]));
  assert.equal(byId["cat-a"], 5);
  assert.equal(byId["cat-b"], 4);
  assert.equal(a.facingsByCategory[0].categoryId, "cat-a"); // sorted desc
});
