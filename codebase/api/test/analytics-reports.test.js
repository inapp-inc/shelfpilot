import test from "node:test";
import assert from "node:assert/strict";
import {
  computeSpaceUtilization,
  computeFixtureDensity,
  computeUnmappedShelves,
  computeCapacityVariance,
  computeAisleCompliance,
  computeCategorySpaceAllocation,
  computeVerticalSpaceUtilization,
  computeWalkability,
  buildLayoutAnalyticsReport,
} from "../src/services/analyticsReports.js";

const categories = [
  { id: "cat-a", name: "Ambient", color: "#111" },
  { id: "cat-b", name: "Chilled", color: "#222" },
];

test("space utilization breakdown matches doc §1.1", () => {
  const layout = {
    id: "L1",
    widthMeters: 10,
    depthMeters: 10,
    aisles: [{ id: "a1", widthMeters: 2, lengthMeters: 10 }],
    zones: [{ id: "z1", widthMeters: 2, depthMeters: 2 }],
    shelves: [
      { id: "s1", widthMeters: 2, depthMeters: 5, categoryId: "cat-a" },
      { id: "s2", widthMeters: 2, depthMeters: 5, categoryId: "cat-b" },
    ],
  };
  const space = computeSpaceUtilization(layout);
  assert.equal(space.totalStoreAreaSqm, 100);
  assert.equal(space.allocatedAreaSqm, 20);
  assert.equal(space.aisleAreaSqm, 20);
  // Merchandising zones are overlays — not exclusive blocked floor.
  assert.equal(space.blockedZoneAreaSqm, 0);
  assert.equal(space.merchandisingZoneAreaSqm, 4);
  assert.equal(space.unusedAreaSqm, 60);
  assert.equal(space.utilizationPercent, 20);
  assert.equal(space.vacancyPercent, 60);
});

test("fixture density uses sq ft (doc benchmarking units)", () => {
  const layout = {
    id: "L-dens",
    widthMeters: 10,
    depthMeters: 10,
    shelves: [{ id: "s1", widthMeters: 2, depthMeters: 1 }],
  };
  const d = computeFixtureDensity(layout);
  assert.equal(d.fixtureCount, 1);
  // 100 m² ≈ 1076.39 sq ft → 1 fixture / 10.7639 ≈ 0.09 per 100 sq ft
  assert.ok(Math.abs(d.fixturesPer100SqFt - 0.09) < 0.02);
});

test("vertical utilization uses linear fill from facings × product width", () => {
  const layout = {
    id: "L-vert",
    widthMeters: 10,
    depthMeters: 10,
    shelves: [
      {
        id: "s1",
        widthMeters: 2,
        depthMeters: 1,
        categoryId: "cat-a",
        levels: [{ levelIndex: 0 }, { levelIndex: 1 }],
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
  const products = [{ id: "p1", categoryId: "cat-a", attributes: { widthMeters: 0.2, heightMeters: 0.25 } }];
  const v = computeVerticalSpaceUtilization(layout, products);
  const bottom = v.levels.find((l) => l.levelIndex === 0);
  const eye = v.levels.find((l) => l.levelIndex === 1);
  assert.equal(bottom.utilizationPercent, 100);
  assert.equal(eye.utilizationPercent, 0);
});

test("walkability reads entryPoints", () => {
  const layout = {
    id: "L-walk",
    widthMeters: 10,
    depthMeters: 10,
    entryPoints: [{ id: "e1", x: 1, y: 1 }],
    shelves: [{ id: "s1", x: 2, y: 2, widthMeters: 1, depthMeters: 1 }],
  };
  const w = computeWalkability(layout);
  assert.equal(w.entryCount, 1);
  assert.equal(w.connected, true);
});

test("unmapped shelf report §1.3", () => {
  const layout = {
    id: "L2",
    widthMeters: 10,
    depthMeters: 10,
    shelves: [
      { id: "s1", widthMeters: 2, depthMeters: 2, categoryId: "cat-a" },
      { id: "s2", widthMeters: 2, depthMeters: 2 },
    ],
  };
  const u = computeUnmappedShelves(layout);
  assert.equal(u.unmappedShelves.length, 1);
  assert.equal(u.emptyShelfAreaSqm, 4);
  assert.equal(u.emptyShelfPercent, 50);
});

test("aisle compliance §4.1", () => {
  const layout = {
    id: "L3",
    aisles: [
      { id: "ok", widthMeters: 1.5 },
      { id: "bad", widthMeters: 0.8 },
    ],
  };
  const c = computeAisleCompliance(layout, { minAisleWidthMeters: 1.2 });
  assert.equal(c.compliantCount, 1);
  assert.equal(c.compliancePercent, 50);
  assert.equal(c.violations.length, 1);
});

test("capacity variance §2.1", () => {
  const layout = {
    id: "L4",
    autoCalc: { maxFixtures: 10 },
    shelves: [{ id: "s1" }, { id: "s2" }, { id: "s3" }],
  };
  const cap = computeCapacityVariance(layout);
  assert.equal(cap.theoreticalMaxFixtures, 10);
  assert.equal(cap.actualFixtureCount, 3);
  assert.equal(cap.variancePercent, -70);
});

test("category space allocation uses area share §3.1", () => {
  const layout = {
    id: "L5",
    widthMeters: 10,
    depthMeters: 10,
    shelves: [
      { id: "s1", widthMeters: 4, depthMeters: 1, categoryId: "cat-a" },
      { id: "s2", widthMeters: 2, depthMeters: 1, categoryId: "cat-b" },
    ],
  };
  const cat = computeCategorySpaceAllocation(layout, categories);
  assert.equal(cat.totalMappedAreaSqm, 6);
  const a = cat.rows.find((r) => r.categoryId === "cat-a");
  assert.ok(a.areaSharePercent > 60);
});

test("category space allocation resolves legacy ids to display names", () => {
  const catalog = [{ id: "cat-vegetables", name: "Vegetables", color: "#090" }];
  const layout = {
    id: "L7",
    shelves: [{ id: "s1", widthMeters: 2, depthMeters: 1, categoryId: "vegetables" }],
  };
  const cat = computeCategorySpaceAllocation(layout, catalog);
  assert.equal(cat.rows.length, 1);
  assert.equal(cat.rows[0].categoryName, "Vegetables");
  assert.equal(cat.rows[0].categoryId, "cat-vegetables");
});

test("category space allocation humanizes unknown ids", () => {
  const layout = {
    id: "L8",
    shelves: [{ id: "s1", widthMeters: 2, depthMeters: 1, categoryId: "cat-dairy-snacks" }],
  };
  const cat = computeCategorySpaceAllocation(layout, []);
  assert.equal(cat.rows[0].categoryName, "Dairy Snacks");
});

test("buildLayoutAnalyticsReport preserves legacy fields", () => {
  const layout = {
    id: "L6",
    widthMeters: 10,
    depthMeters: 10,
    shelves: [{ id: "s1", widthMeters: 2, depthMeters: 3, categoryId: "cat-a" }],
    autoCalc: { maxFixtures: 5 },
  };
  const report = buildLayoutAnalyticsReport(layout, categories, { minAisleWidthMeters: 1.2 }, []);
  assert.equal(report.layoutId, "L6");
  assert.ok(report.spaceUtilization);
  assert.ok(report.executiveKpis);
  assert.equal(report.usedAreaSqm, 6);
  assert.equal(report.allocationByCategory.length, 1);
});
