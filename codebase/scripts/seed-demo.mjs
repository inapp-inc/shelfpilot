/**
 * Seed 3 demo store layouts with fixtures, aisles, mappings.
 * Run from codebase/: node scripts/seed-demo.mjs
 * Uses SQLITE_PATH (default ./api/data or env).
 */
import { getDb, repo, now } from "../api/src/store/sqlite.js";
import { computeAutoCalc, validateAisles } from "../api/src/services/layoutMath.js";

function refresh(layout) {
  const config = repo.getConfig(layout.vertical);
  layout.validation = { aisleViolations: validateAisles(layout, config) };
  layout.autoCalc = computeAutoCalc(layout, config);
  layout.updatedAt = now();
  return layout;
}

function upsertLayout(layout) {
  const existing = repo.listLayouts().find((l) => l.name === layout.name);
  if (existing) {
    layout.id = existing.id;
  }
  refresh(layout);
  repo.saveLayout(layout);
  return layout;
}

function main() {
  getDb();
  // Ensure catalog richness
  awaitImportCatalog();

  const pharmacy = upsertLayout({
    id: "lay-demo-pharmacy",
    name: "Downtown Pharmacy #12",
    vertical: "pharmacy",
    status: "in_review",
    widthMeters: 18,
    depthMeters: 12,
    heightMeters: 3,
    shape: "rectangle",
    polygon: [],
    aisles: [{ id: "a1", name: "Main", widthMeters: 1.6, path: [], violations: [] }],
    fixtures: [
      { id: "f1", type: "shelf", label: "OTC bay", widthMeters: 1.0, depthMeters: 0.5, heightMeters: 2, x: 2, y: 2, rotationDeg: 0, categoryId: "otc", color: "#0ea5e9" },
      { id: "f2", type: "rack", label: "Rx", widthMeters: 0.8, depthMeters: 0.4, heightMeters: 2, x: 6, y: 2, rotationDeg: 0, categoryId: "rx", color: "#a855f7" },
      { id: "f3", type: "shelf", label: "Vitamins", widthMeters: 1.0, depthMeters: 0.5, heightMeters: 2, x: 10, y: 4, rotationDeg: 0, categoryId: "vitamins", color: "#ca8a04" },
    ],
    mappings: [
      { fixtureId: "f1", categoryId: "otc", color: "#0ea5e9" },
      { fixtureId: "f2", categoryId: "rx", color: "#a855f7" },
      { fixtureId: "f3", categoryId: "vitamins", color: "#ca8a04" },
    ],
  });

  const apparel = upsertLayout({
    id: "lay-demo-apparel",
    name: "Westside Apparel",
    vertical: "apparel",
    status: "draft",
    widthMeters: 24,
    depthMeters: 16,
    heightMeters: 3.2,
    shape: "rectangle",
    polygon: [],
    aisles: [{ id: "a1", name: "Runway", widthMeters: 1.2, path: [], violations: [] }],
    fixtures: [
      { id: "f1", type: "rack", label: "Womens", widthMeters: 1.2, depthMeters: 0.6, heightMeters: 1.8, x: 3, y: 3, rotationDeg: 0, categoryId: "womens", color: "#db2777" },
      { id: "f2", type: "rack", label: "Mens", widthMeters: 1.2, depthMeters: 0.6, heightMeters: 1.8, x: 8, y: 3, rotationDeg: 0 },
    ],
    mappings: [{ fixtureId: "f1", categoryId: "womens", color: "#db2777" }],
  });

  const retail = upsertLayout({
    id: "lay-demo-retail",
    name: "City Retail Hub",
    vertical: "retail",
    status: "approved",
    widthMeters: 30,
    depthMeters: 20,
    heightMeters: 3.5,
    shape: "rectangle",
    polygon: [],
    aisles: [{ id: "a1", name: "Center", widthMeters: 1.5, path: [], violations: [] }],
    fixtures: [
      { id: "f1", type: "gondola", label: "Electronics", widthMeters: 1.8, depthMeters: 0.9, heightMeters: 2, x: 4, y: 4, rotationDeg: 0, categoryId: "electronics", color: "#3b82f6" },
      { id: "f2", type: "shelf", label: "Grocery", widthMeters: 1.2, depthMeters: 0.6, heightMeters: 2, x: 10, y: 4, rotationDeg: 0, categoryId: "grocery", color: "#16a34a" },
      { id: "f3", type: "storage", label: "Backstock", widthMeters: 2, depthMeters: 1, heightMeters: 2.5, x: 20, y: 12, rotationDeg: 0 },
    ],
    mappings: [
      { fixtureId: "f1", categoryId: "electronics", color: "#3b82f6" },
      { fixtureId: "f2", categoryId: "grocery", color: "#16a34a" },
    ],
  });

  console.log("seed:demo OK —", [pharmacy, apparel, retail].map((l) => `${l.name} (${l.status})`).join("; "));
}

function awaitImportCatalog() {
  // Inline minimal upserts so seed works without chaining
  const extras = [
    { id: "home", name: "Home Goods", vertical: "retail", color: "#16a34a" },
    { id: "seasonal", name: "Seasonal", vertical: "retail", color: "#ea580c" },
    { id: "vitamins", name: "Vitamins", vertical: "pharmacy", color: "#ca8a04" },
  ];
  for (const c of extras) repo.upsertCategory(c);
}

main();
