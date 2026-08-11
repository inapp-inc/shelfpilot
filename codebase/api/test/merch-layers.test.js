process.env.NODE_ENV = "test";
process.env.SQLITE_PATH = ":memory:";

import assert from "node:assert/strict";
import test from "node:test";
import { resetDbForTests } from "../src/store/sqlite.js";
import app from "../src/index.js";
import { packAislesAndShelves, levelsForType } from "../src/services/layoutPacker.js";
import { collectContainmentViolations, entityInsideLayout } from "../src/services/polygonContainment.js";
import { acceptArrangement } from "./helpers.js";

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

async function login(port, role = "Designer", email = "designer@shelfpilot.local") {
  const res = await fetch(`http://127.0.0.1:${port}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password: "password", role }),
  });
  const body = await res.json();
  assert.equal(res.status, 200, JSON.stringify(body));
  return body.token;
}

const L_SHAPE = [
  { x: 0, y: 0 },
  { x: 20, y: 0 },
  { x: 20, y: 6 },
  { x: 8, y: 6 },
  { x: 8, y: 12 },
  { x: 0, y: 12 },
];

test("levelsForType gondola defaults to 3 levels", () => {
  assert.equal(levelsForType("gondola", 2, 3).length, 3);
  assert.equal(levelsForType("rack", 2).length, 4);
});

test("packer on L-shaped polygon has zero containment violations", () => {
  const layout = {
    id: "lay-l",
    widthMeters: 20,
    depthMeters: 12,
    shape: "polygon",
    polygon: L_SHAPE,
  };
  const packed = packAislesAndShelves(layout, {
    minAisleWidthMeters: 1.2,
    orientation: "horizontal",
    shelfTemplate: { usableWidthMeters: 1.2, depthMeters: 0.6, heightMeters: 2, type: "shelf" },
  });
  layout.aisles = packed.aisles;
  layout.shelves = packed.shelves;
  assert.equal(collectContainmentViolations(layout).length, 0);
  for (const s of packed.shelves) assert.equal(entityInsideLayout(s, "shelf", layout), true);
  for (const a of packed.aisles) assert.equal(entityInsideLayout(a, "aisle", layout), true);
});

test("packer skips shelves that do not fit concave polygon (blank outside)", () => {
  const layout = {
    id: "lay-c",
    widthMeters: 20,
    depthMeters: 12,
    shape: "polygon",
    polygon: L_SHAPE,
  };
  const packed = packAislesAndShelves(layout, {
    minAisleWidthMeters: 1.2,
    orientation: "vertical",
    shelfTemplate: { usableWidthMeters: 1.2, depthMeters: 0.6, heightMeters: 2, type: "shelf" },
  });
  layout.aisles = packed.aisles;
  layout.shelves = packed.shelves;
  assert.equal(collectContainmentViolations(layout).length, 0);
  assert.ok(packed.droppedOutsidePolygon >= 0);
  for (const s of packed.shelves) {
    assert.equal(entityInsideLayout(s, "shelf", layout), true);
  }
});

test("product create and patch; multilevel planogram placements", async () => {
  await withServer(async (port) => {
    const token = await login(port, "Designer");
    const headers = {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    };

    const created = await fetch(`http://127.0.0.1:${port}/products`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: "Test Serum",
        sku: "TS-1",
        categoryId: "painrelief",
        attributes: { widthMeters: 0.1, heightMeters: 0.15 },
      }),
    });
    assert.equal(created.status, 201);
    const product = await created.json();

    const patched = await fetch(`http://127.0.0.1:${port}/products/${product.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ name: "Test Serum XL", attributes: { widthMeters: 0.15 } }),
    });
    assert.equal(patched.status, 200);
    const after = await patched.json();
    assert.equal(after.name, "Test Serum XL");
    assert.equal(after.attributes.widthMeters, 0.15);

    const layoutRes = await fetch(`http://127.0.0.1:${port}/layouts`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: "ML Store",
        vertical: "pharmacy",
        widthMeters: 20,
        depthMeters: 12,
        shape: "polygon",
        polygon: L_SHAPE,
      }),
    });
    const layout = await layoutRes.json();

    const gen = await fetch(`http://127.0.0.1:${port}/layouts/${layout.id}/autogenerate`, {
      method: "POST",
      headers,
      body: JSON.stringify({ orientation: "horizontal", replaceExisting: true }),
    });
    assert.equal(gen.status, 200);
    const generated = await gen.json();
    assert.equal((generated.validation?.containmentViolations || []).length, 0);
    assert.ok(generated.shelves.length >= 1);

    const shelf = generated.shelves[0];
    await fetch(`http://127.0.0.1:${port}/layouts/${layout.id}/shelves/${shelf.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ categoryId: "otc", color: "#0ea5e9" }),
    });

    await acceptArrangement(port, headers, layout.id);

    const p0 = await fetch(`http://127.0.0.1:${port}/layouts/${layout.id}/shelves/${shelf.id}/planogram`, {
      method: "POST",
      headers,
      body: JSON.stringify({ productId: product.id, levelIndex: 0, facings: 2 }),
    });
    assert.equal(p0.status, 201);

    const p1 = await fetch(`http://127.0.0.1:${port}/layouts/${layout.id}/shelves/${shelf.id}/planogram`, {
      method: "POST",
      headers,
      body: JSON.stringify({ productId: "p1", levelIndex: 1, facings: 2 }),
    });
    assert.equal(p1.status, 201);
    const withBoth = await p1.json();
    const pog = withBoth.shelves.find((s) => s.id === shelf.id).planogram;
    assert.ok(pog.some((x) => x.levelIndex === 0));
    assert.ok(pog.some((x) => x.levelIndex === 1));
  });
});
