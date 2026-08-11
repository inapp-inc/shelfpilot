process.env.NODE_ENV = "test";
process.env.SQLITE_PATH = ":memory:";

import test from "node:test";
import assert from "node:assert/strict";
import { resetDbForTests, getConfig } from "../src/store/sqlite.js";
import app from "../src/index.js";
import { packAislesAndShelves } from "../src/services/layoutPacker.js";
import { autogenerateLayoutFixtures } from "../src/services/layoutAutogenerate.js";
import { validateAisles } from "../src/services/layoutMath.js";
import {
  isWarehouseVertical,
  isSingleSidedPlacementType,
  WAREHOUSE_MIN_AISLE_M,
} from "../src/services/warehouseLayout.js";
import { aisleFootprint } from "../src/services/polygonContainment.js";
import { overlapsAnyShelf } from "../src/services/polygonContainment.js";

function aisleOverlapArea(a, b, layout) {
  const fa = aisleFootprint(a, layout);
  const fb = aisleFootprint(b, layout);
  const ox = Math.max(0, Math.min(fa.x + fa.w, fb.x + fb.w) - Math.max(fa.x, fb.x));
  const oy = Math.max(0, Math.min(fa.y + fa.d, fb.y + fb.d) - Math.max(fa.y, fb.y));
  return ox * oy;
}

function countAisleOverlaps(layout) {
  let aa = 0;
  let as = 0;
  for (let i = 0; i < layout.aisles.length; i++) {
    for (let j = i + 1; j < layout.aisles.length; j++) {
      if (aisleOverlapArea(layout.aisles[i], layout.aisles[j], layout) > 0.05) aa++;
    }
    if (overlapsAnyShelf(layout.aisles[i], layout)) as++;
  }
  return { aa, as };
}

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

async function login(port, role = "Designer") {
  const res = await fetch(`http://127.0.0.1:${port}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "designer@shelfpilot.local", password: "password", role }),
  });
  const body = await res.json();
  assert.equal(res.status, 200);
  return body.token;
}

test("warehouse vertical config has rack templates and wide aisles", async () => {
  resetDbForTests();
  const { getDb } = await import("../src/store/sqlite.js");
  getDb();
  const config = getConfig("warehouse");
  assert.equal(config.vertical, "warehouse");
  assert.equal(config.layoutMode, "warehouse");
  assert.equal(config.minAisleWidthMeters, WAREHOUSE_MIN_AISLE_M);
  assert.ok(config.fixtureTemplates.some((t) => t.type === "pallet_rack"));
  assert.ok(config.fixtureTemplates.some((t) => t.type === "selective_rack"));
  assert.ok(isWarehouseVertical("warehouse"));
  assert.ok(isSingleSidedPlacementType("pallet_rack", "retail"));
  assert.ok(isSingleSidedPlacementType("shelf", "warehouse"));
});

test("warehouse packer creates single-sided bays (no gondola pairs)", () => {
  const layout = {
    id: "wh-pack",
    vertical: "warehouse",
    widthMeters: 40,
    depthMeters: 30,
    polygon: [
      { x: 0, y: 0 },
      { x: 40, y: 0 },
      { x: 40, y: 30 },
      { x: 0, y: 30 },
    ],
  };
  const minAisle = 3.0;
  const packed = packAislesAndShelves(layout, {
    warehouseMode: true,
    minAisleWidthMeters: minAisle,
    orientation: "vertical",
    shelfTemplate: {
      type: "pallet_rack",
      usableWidthMeters: 2.7,
      depthMeters: 1.1,
      heightMeters: 6,
      defaultLevels: 4,
    },
  });
  assert.ok(packed.shelves.length > 0);
  assert.ok(packed.aisles.length > 0);
  assert.ok(!packed.shelves.some((s) => s.pairId));
  assert.ok(packed.aisles.every((a) => Number(a.widthMeters) >= minAisle - 1e-6));
  const packedLayout = { ...layout, aisles: packed.aisles, shelves: packed.shelves };
  const { aa, as } = countAisleOverlaps(packedLayout);
  assert.equal(aa, 0);
  assert.equal(as, 0);
});

test("warehouse smart generate produces compliant aisles only", async () => {
  resetDbForTests();
  const { getDb, getConfig, repo } = await import("../src/store/sqlite.js");
  getDb();
  const layout = {
    id: "wh-autogen",
    vertical: "warehouse",
    widthMeters: 40,
    depthMeters: 30,
    heightMeters: 8,
    polygon: [
      { x: 0, y: 0 },
      { x: 40, y: 0 },
      { x: 40, y: 30 },
      { x: 0, y: 30 },
    ],
    aisles: [],
    shelves: [],
  };
  const config = getConfig("warehouse");
  autogenerateLayoutFixtures(
    layout,
    {
      orientation: "vertical",
      categoryMix: [
        { categoryId: "wh-pick", percent: 50, fixtureType: "selective_rack" },
        { categoryId: "wh-bulk", percent: 50, fixtureType: "pallet_rack" },
      ],
    },
    { getConfig, listCategories: () => repo.listCategories() },
  );
  const violations = validateAisles(layout, config);
  assert.equal(violations.length, 0, violations.join("; "));
  assert.ok(layout.shelves.length > 0);
  assert.ok(layout.aisles.length > 0);
  assert.ok(layout.aisles.every((a) => Number(a.widthMeters) >= WAREHOUSE_MIN_AISLE_M - 1e-6));
  assert.ok(!layout.shelves.some((s) => s.pairId));
  const { aa, as } = countAisleOverlaps(layout);
  assert.equal(aa, 0, "warehouse aisles must not overlap each other");
  assert.equal(as, 0, "warehouse aisles must not overlap racks");
});

test("POST shelf on warehouse layout creates single rack bay", async () => {
  await withServer(async (port) => {
    const token = await login(port);
    const headers = { "content-type": "application/json", authorization: `Bearer ${token}` };
    const layoutRes = await fetch(`http://127.0.0.1:${port}/layouts`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: "WH DC",
        vertical: "warehouse",
        widthMeters: 40,
        depthMeters: 30,
        heightMeters: 8,
      }),
    });
    assert.equal(layoutRes.status, 201);
    const layout = await layoutRes.json();
    assert.equal(layout.vertical, "warehouse");

    const created = await fetch(`http://127.0.0.1:${port}/layouts/${layout.id}/shelves`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        type: "selective_rack",
        widthMeters: 2.4,
        depthMeters: 1.0,
        heightMeters: 5,
        x: 4,
        y: 4,
      }),
    });
    const createdText = await created.text();
    assert.equal(created.status, 201, createdText);
    const withRack = JSON.parse(createdText);
    assert.equal(withRack.shelves.length, 1);
    assert.equal(withRack.shelves[0].type, "selective_rack");
    assert.equal(withRack.shelves[0].pairId, null);
  });
});
