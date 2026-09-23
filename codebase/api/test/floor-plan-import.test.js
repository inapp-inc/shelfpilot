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

test("POST /layouts fixture import builds shelves from runs when flag enabled", async () => {
  const prev = process.env.PLAN_FIXTURE_IMPORT_ENABLED;
  process.env.PLAN_FIXTURE_IMPORT_ENABLED = "true";
  try {
    await withServer(async (port) => {
      const token = await login(port);
      const res = await fetch(`http://127.0.0.1:${port}/layouts`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: "Fixture Import Store",
          vertical: "hypermarket",
          widthMeters: 40,
          depthMeters: 30,
          heightMeters: 3.2,
          shape: "rectangle",
          polygon: [],
          autoGenerateFixtures: false,
          floorPlanImport: {
            sourceFileName: "layout2.pdf",
            sourceType: "pdf",
            importMode: "fixture",
            runs: [
              {
                id: "run-a",
                label: "AMBIENT 9m",
                kind: "ambient_gondola",
                lengthMeters: 9,
                depthMeters: 0.6,
              },
              {
                id: "run-b",
                label: "AMBIENT 10m",
                kind: "ambient_gondola",
                lengthMeters: 10,
                depthMeters: 0.6,
              },
            ],
            aisleHints: [{ widthMeters: 1.5, source: "1500 mm" }],
            warnings: [],
          },
        }),
      });
      const layout = await res.json();
      assert.equal(res.status, 201, JSON.stringify(layout));
      assert.equal(layout.importSource?.fixtureImport?.runCount, 2);
      assert.ok(layout.generated?.fixtureImport);
      const widths = (layout.shelves || []).map((s) => s.usableWidthMeters).sort((a, b) => a - b);
      assert.deepEqual(widths, [9, 10]);
    });
  } finally {
    if (prev == null) delete process.env.PLAN_FIXTURE_IMPORT_ENABLED;
    else process.env.PLAN_FIXTURE_IMPORT_ENABLED = prev;
  }
});

test("POST /layouts simplified newLayout text import places north refrigeration and gondolas", async () => {
  const prev = process.env.PLAN_FIXTURE_IMPORT_ENABLED;
  process.env.PLAN_FIXTURE_IMPORT_ENABLED = "true";
  const fs = await import("node:fs");
  const path = await import("node:path");
  const { fileURLToPath } = await import("node:url");
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const planText = fs.readFileSync(
    path.join(__dirname, "fixtures/layout-newlayout-text-extract.txt"),
    "utf8"
  );
  const { analyzePlanTextContent } = await import("../../shared/planTextAnalyze.mjs");
  const analyzed = analyzePlanTextContent(planText, { fileName: "newLayout.txt" });
  try {
    await withServer(async (port) => {
      const token = await login(port);
      const res = await fetch(`http://127.0.0.1:${port}/layouts`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: "New layout from plan",
          vertical: "hypermarket",
          widthMeters: analyzed.widthMeters,
          depthMeters: analyzed.depthMeters,
          heightMeters: 3.2,
          shape: "rectangle",
          polygon: [],
          autoGenerateFixtures: false,
          floorPlanImport: {
            sourceFileName: "newLayout.txt",
            sourceType: "text",
            importMode: "fixture",
            runs: analyzed.fixturePlan.runs,
            aisleHints: analyzed.fixturePlan.aisleHints,
            warnings: analyzed.fixturePlan.warnings,
            planText,
          },
        }),
      });
      const layout = await res.json();
      assert.equal(res.status, 201, JSON.stringify(layout));
      assert.ok(layout.generated?.fixtureImport);
      assert.ok((layout.shelves || []).length >= 11);
      const chilled = layout.shelves.filter((s) => s.type === "chilled");
      const frozen = layout.shelves.filter((s) => s.type === "frozen");
      assert.equal(chilled.length, 1);
      assert.equal(frozen.length, 5);
      assert.ok((layout.obstacles || []).length >= 2);
    });
  } finally {
    if (prev == null) delete process.env.PLAN_FIXTURE_IMPORT_ENABLED;
    else process.env.PLAN_FIXTURE_IMPORT_ENABLED = prev;
  }
});

test("POST /layouts fixture import ignored when flag disabled", async () => {
  const prev = process.env.PLAN_FIXTURE_IMPORT_ENABLED;
  process.env.PLAN_FIXTURE_IMPORT_ENABLED = "false";
  try {
    await withServer(async (port) => {
      const token = await login(port);
      const res = await fetch(`http://127.0.0.1:${port}/layouts`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: "Envelope Fallback",
          vertical: "retail",
          widthMeters: 28,
          depthMeters: 17,
          heightMeters: 3.2,
          polygon: [],
          floorPlanImport: {
            sourceFileName: "plan.pdf",
            importMode: "fixture",
            runs: [
              { id: "run-a", kind: "ambient_gondola", lengthMeters: 9, depthMeters: 0.6 },
            ],
          },
          autoGenerateFixtures: true,
        }),
      });
      const layout = await res.json();
      assert.equal(res.status, 201, JSON.stringify(layout));
      assert.ok(!layout.importSource?.fixtureImport);
      assert.ok((layout.shelves || []).length > 0);
    });
  } finally {
    if (prev == null) delete process.env.PLAN_FIXTURE_IMPORT_ENABLED;
    else process.env.PLAN_FIXTURE_IMPORT_ENABLED = prev;
  }
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
