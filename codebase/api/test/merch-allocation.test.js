import test from "node:test";
import assert from "node:assert/strict";
import {
  computeMerchandisingFill,
  computeCategoryMerchAllocation,
  computeFacingsReport,
  placementLinearMeters,
} from "../src/services/merchAllocation.js";
import { computeAnalytics } from "../src/services/layoutMath.js";

const categories = [
  { id: "cat-a", name: "Ambient", color: "#111" },
  { id: "cat-b", name: "Chilled", color: "#222" },
];

const products = [
  { id: "p1", categoryId: "cat-a", attributes: { widthMeters: 0.2, depthMeters: 0.15, heightMeters: 0.25 } },
  { id: "p2", categoryId: "cat-b", attributes: { widthMeters: 0.25, depthMeters: 0.2, heightMeters: 0.3 } },
];

test("placementLinearMeters uses facings and product width", () => {
  const linear = placementLinearMeters({ facings: 4 }, products[0]);
  assert.equal(linear, 0.8);
});

test("merchandising fill compares used linear to shelf usable width capacity", () => {
  const layout = {
    id: "L-merch",
    widthMeters: 10,
    depthMeters: 10,
    shelves: [
      {
        id: "s1",
        usableWidthMeters: 2,
        widthMeters: 2,
        depthMeters: 1,
        levels: [{ levelIndex: 0 }],
        faces: [
          {
            id: "A",
            categoryId: "cat-a",
            planogram: [{ productId: "p1", levelIndex: 0, facings: 5 }],
          },
        ],
      },
    ],
  };
  const fill = computeMerchandisingFill(layout, products);
  assert.equal(fill.usedLinearMeters, 1);
  assert.equal(fill.totalLinearCapacityMeters, 2);
  assert.equal(fill.linearFillPercent, 50);
});

test("category merch allocation weights planogram linear metres", () => {
  const layout = {
    id: "L-cat",
    shelves: [
      {
        id: "s1",
        usableWidthMeters: 2,
        widthMeters: 2,
        depthMeters: 1,
        faces: [
          {
            id: "A",
            categoryId: "cat-a",
            planogram: [{ productId: "p1", levelIndex: 0, facings: 8, depthFacings: 1 }],
          },
          {
            id: "B",
            categoryId: "cat-b",
            planogram: [{ productId: "p2", levelIndex: 0, facings: 4, depthFacings: 1 }],
          },
        ],
      },
    ],
  };
  const cat = computeCategoryMerchAllocation(
    layout,
    categories,
    products,
    (id) => (id === "cat-a" || id === "cat-b" ? id : id),
    (id, cats) => cats.find((c) => c.id === id)?.name || id
  );
  const a = cat.rows.find((r) => r.categoryId === "cat-a");
  const b = cat.rows.find((r) => r.categoryId === "cat-b");
  assert.equal(a.linearMeters, 1.6);
  assert.equal(b.linearMeters, 1);
  assert.ok(a.linearSharePercent > b.linearSharePercent);
});

test("facings report flags over-allocation vs usable width", () => {
  const layout = {
    id: "L-over",
    shelves: [
      {
        id: "s1",
        usableWidthMeters: 1,
        widthMeters: 1,
        depthMeters: 0.6,
        faces: [
          {
            id: "A",
            categoryId: "cat-a",
            planogram: [{ productId: "p1", levelIndex: 0, facings: 10 }],
          },
        ],
      },
    ],
  };
  const report = computeFacingsReport(layout, categories, products);
  assert.equal(report.overfillCount, 1);
  assert.equal(report.facingsTotal, 10);
});

test("computeAnalytics exposes merchandising fill on dashboard bundle", () => {
  const layout = {
    id: "L-dash",
    widthMeters: 10,
    depthMeters: 10,
    shelves: [
      {
        id: "s1",
        widthMeters: 2,
        depthMeters: 1,
        categoryId: "cat-a",
        faces: [{ id: "A", categoryId: "cat-a", planogram: [{ productId: "p1", facings: 4, levelIndex: 0 }] }],
      },
    ],
  };
  const report = computeAnalytics(layout, categories, {}, () => products);
  assert.ok(report.merchandisingFill);
  assert.equal(report.executiveKpis.linearFillPercent, report.merchandisingFill.linearFillPercent);
  assert.ok(report.footprintSqm >= 100);
});
