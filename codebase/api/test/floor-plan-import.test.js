process.env.NODE_ENV = "test";
process.env.SQLITE_PATH = ":memory:";

import test from "node:test";
import assert from "node:assert/strict";
import { resetDbForTests } from "../src/store/sqlite.js";
import app from "../src/index.js";
import { normalizeFloorPlan } from "../src/services/floorPlan.js";
import {
  floorPlanEnvelopeBinding,
  fullStorePolygon,
  inferFloorPlanSourceType,
} from "../src/services/floorPlanImport.js";
import {
  mergeDimensionCandidates,
  parseStoreDimensionsFromFileName,
  parseStoreDimensionsFromText,
} from "../../shared/floorPlanDimensions.mjs";

const TINY_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAD0lEQVQ42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

async function withServer(fn) {
  resetDbForTests();
  const { getDb } = await import("../src/store/sqlite.js");
  getDb();
  const server = app.listen(0);
  const { port } = server.address();
  try {
    await fn(port);
  } finally {
    server.close();
  }
}

async function login(port) {
  const res = await fetch(`http://127.0.0.1:${port}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "designer@shelfpilot.local", password: "password", role: "Designer" }),
  });
  const body = await res.json();
  assert.equal(res.status, 200, JSON.stringify(body));
  return body.token;
}

test("fullStorePolygon builds rectangle fixture zone", () => {
  const poly = fullStorePolygon(24, 16);
  assert.equal(poly.length, 4);
  assert.deepEqual(poly[2], { x: 24, y: 16 });
});

test("floorPlanEnvelopeBinding prefers payload metres", () => {
  const binding = floorPlanEnvelopeBinding({ widthMeters: 10, depthMeters: 8 }, { widthMeters: 30, depthMeters: 18 });
  assert.equal(binding.widthMeters, 30);
  assert.equal(binding.depthMeters, 18);
});

test("inferFloorPlanSourceType detects pdf and svg", () => {
  assert.equal(inferFloorPlanSourceType("store.pdf"), "pdf");
  assert.equal(inferFloorPlanSourceType("plan.svg"), "svg");
  assert.equal(inferFloorPlanSourceType("scan.png"), "image");
  assert.equal(inferFloorPlanSourceType("x.png", "pdf"), "pdf");
});

test("normalizeFloorPlan preserves import metadata", () => {
  const plan = normalizeFloorPlan({
    url: "/floor-plans/x.png",
    fileName: "store-page1.png",
    sourceType: "pdf",
    sourceFileName: "store.pdf",
    pageIndex: 0,
    widthMeters: 30,
    depthMeters: 18,
  });
  assert.equal(plan.sourceType, "pdf");
  assert.equal(plan.sourceFileName, "store.pdf");
  assert.equal(plan.pageIndex, 0);
  assert.equal(plan.widthMeters, 30);
  assert.equal(plan.depthMeters, 18);
});

test("parseStoreDimensionsFromText reads L x W labels", () => {
  const parsed = parseStoreDimensionsFromText("Store footprint 28m x 17m retail floor");
  assert.equal(parsed.widthMeters, 28);
  assert.equal(parsed.depthMeters, 17);
  assert.equal(parsed.source, "text");
});

test("parseStoreDimensionsFromFileName reads dimensions in name", () => {
  const parsed = parseStoreDimensionsFromFileName("hypermarket-30x20m.pdf");
  assert.equal(parsed.widthMeters, 30);
  assert.equal(parsed.depthMeters, 20);
});

test("mergeDimensionCandidates prefers first valid parse", () => {
  const merged = mergeDimensionCandidates(
    { widthMeters: null, depthMeters: null, source: "none" },
    { widthMeters: 24, depthMeters: 16, source: "filename" }
  );
  assert.equal(merged.widthMeters, 24);
});

test("POST /layouts with floorPlanImport builds fixtures without image underlay", async () => {
  await withServer(async (port) => {
    const token = await login(port);
    const res = await fetch(`http://127.0.0.1:${port}/layouts`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: "Built From Plan",
        vertical: "retail",
        widthMeters: 28,
        depthMeters: 17,
        heightMeters: 3.2,
        shape: "rectangle",
        polygon: [],
        floorPlanImport: {
          sourceFileName: "store-28x17m.pdf",
          sourceType: "pdf",
          dimensionSource: "filename",
          matchedText: "28x17m",
          pageIndex: 0,
        },
        autoGenerateFixtures: true,
      }),
    });
    const layout = await res.json();
    assert.equal(res.status, 201, JSON.stringify(layout));
    assert.equal(layout.floorPlan, null);
    assert.ok(layout.importSource);
    assert.equal(layout.importSource.fileName, "store-28x17m.pdf");
    assert.equal(layout.shape, "polygon");
    assert.equal(layout.polygon?.length, 4);
    assert.ok((layout.shelves || []).length > 0, "expected auto-generated shelves");
    assert.ok((layout.aisles || []).length > 0, "expected auto-generated aisles");
    assert.ok(layout.generated?.shelves > 0);
  });
});

test("POST /layouts legacy floor plan image still binds underlay", async () => {
  await withServer(async (port) => {
    const token = await login(port);
    const res = await fetch(`http://127.0.0.1:${port}/layouts`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: "Import Test Store",
        vertical: "retail",
        widthMeters: 28,
        depthMeters: 17,
        heightMeters: 3.2,
        shape: "rectangle",
        polygon: [],
        floorPlan: {
          dataBase64: TINY_PNG,
          fileName: "arch-plan-page1.png",
          sourceType: "pdf",
          sourceFileName: "arch-plan.pdf",
          pageIndex: 0,
          widthMeters: 28,
          depthMeters: 17,
          opacity: 0.75,
        },
      }),
    });
    const layout = await res.json();
    assert.equal(res.status, 201, JSON.stringify(layout));
    assert.ok(layout.floorPlan?.url);
    assert.equal(layout.floorPlan.sourceType, "pdf");
    assert.equal(layout.widthMeters, 28);
    assert.equal(layout.depthMeters, 17);
  });
});
