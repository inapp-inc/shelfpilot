process.env.NODE_ENV = "test";
process.env.SQLITE_PATH = ":memory:";

import assert from "node:assert/strict";
import test from "node:test";
import { resetDbForTests } from "../src/store/sqlite.js";
import app from "../src/index.js";
import {
  pointInPolygon,
  rectFullyInsidePolygon,
  layoutBoundaryPolygon,
  entityInsideLayout,
} from "../src/services/polygonContainment.js";
import { packAislesAndShelves } from "../src/services/layoutPacker.js";
import { descendantCategoryIds, productAllowedForShelf } from "../src/services/categoryTree.js";
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

test("pointInPolygon includes interior and boundary", () => {
  const poly = [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 8 },
    { x: 0, y: 8 },
  ];
  assert.equal(pointInPolygon({ x: 5, y: 4 }, poly), true);
  assert.equal(pointInPolygon({ x: 0, y: 0 }, poly), true);
  assert.equal(pointInPolygon({ x: 11, y: 4 }, poly), false);
});

test("rectFullyInsidePolygon rejects overhang", () => {
  const poly = layoutBoundaryPolygon({ widthMeters: 10, depthMeters: 8, shape: "rectangle" });
  assert.equal(rectFullyInsidePolygon(1, 1, 2, 1, poly), true);
  assert.equal(rectFullyInsidePolygon(9, 1, 2, 1, poly), false);
});

test("packer emits only contained shelves and null categories", () => {
  const layout = {
    id: "lay-t",
    widthMeters: 20,
    depthMeters: 12,
    shape: "rectangle",
  };
  const packed = packAislesAndShelves(layout, {
    minAisleWidthMeters: 1.2,
    shelfTemplate: { usableWidthMeters: 1.2, depthMeters: 0.6, heightMeters: 2 },
    orientation: "horizontal",
  });
  assert.ok(packed.shelves.length > 0);
  assert.ok(packed.aisles.length >= 1);
  for (const s of packed.shelves) {
    assert.equal(s.categoryId, null);
    assert.equal(entityInsideLayout(s, "shelf", layout), true);
  }
  for (const a of packed.aisles) {
    assert.equal(entityInsideLayout(a, "aisle", layout), true);
  }
});

test("category descendants include children", () => {
  const cats = [
    { id: "otc", parentId: null },
    { id: "painrelief", parentId: "otc" },
    { id: "rx", parentId: null },
  ];
  const ids = descendantCategoryIds("otc", cats);
  assert.ok(ids.has("otc"));
  assert.ok(ids.has("painrelief"));
  assert.equal(ids.has("rx"), false);
  assert.equal(productAllowedForShelf({ categoryId: "painrelief" }, "otc", cats), true);
  assert.equal(productAllowedForShelf({ categoryId: "rx" }, "otc", cats), false);
});

test("autogenerate uses simple thin aisles when configured width does not fit", async () => {
  await withServer(async (port) => {
    const token = await login(port, "Designer");
    const headers = {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    };
    const create = await fetch(`http://127.0.0.1:${port}/layouts`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: "HM Aisle Width",
        vertical: "hypermarket",
        widthMeters: 24,
        depthMeters: 16,
      }),
    });
    const layout = await create.json();
    assert.equal(create.status, 201, JSON.stringify(layout));

    const gen = await fetch(`http://127.0.0.1:${port}/layouts/${layout.id}/autogenerate`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        orientation: "horizontal",
        replaceExisting: true,
        minAisleWidthMeters: 1.2,
      }),
    });
    const body = await gen.json();
    assert.equal(gen.status, 200, JSON.stringify(body));
    assert.ok((body.aisles || []).length >= 1);
    for (const aisle of body.aisles) {
      assert.ok(
        Number(aisle.widthMeters) >= 0.45 - 1e-9,
        `aisle ${aisle.id || aisle.name} width ${aisle.widthMeters} < walk minimum`
      );
    }
    assert.ok(
      (body.shelves || []).every((s) => s.aisleId),
      "every shelf should bind to a walk aisle after autogenerate"
    );
  });
});

test("PATCH shelf outside returns containment_violation; autogenerate works", async () => {
  await withServer(async (port) => {
    const token = await login(port, "Designer");
    const headers = {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    };
    const create = await fetch(`http://127.0.0.1:${port}/layouts`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: "Contain Store",
        vertical: "pharmacy",
        widthMeters: 20,
        depthMeters: 12,
      }),
    });
    const layout = await create.json();
    const fx = await fetch(`http://127.0.0.1:${port}/layouts/${layout.id}/fixtures`, {
      method: "POST",
      headers,
      body: JSON.stringify({ type: "shelf", widthMeters: 1.2, depthMeters: 0.5, x: 1, y: 1 }),
    });
    assert.equal(fx.status, 201);
    const shelfId = (await fx.json()).shelves[0].id;

    const bad = await fetch(`http://127.0.0.1:${port}/layouts/${layout.id}/shelves/${shelfId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ x: 100, y: 100 }),
    });
    assert.equal(bad.status, 400);
    assert.equal((await bad.json()).error, "containment_violation");

    const gen = await fetch(`http://127.0.0.1:${port}/layouts/${layout.id}/autogenerate`, {
      method: "POST",
      headers,
      body: JSON.stringify({ orientation: "horizontal", replaceExisting: true }),
    });
    assert.equal(gen.status, 200);
    const body = await gen.json();
    assert.ok(body.generated.shelves >= 1);
    assert.ok(body.shelves.every((s) => s.categoryId == null));

    const unmapped = body.shelves[0];
    const products = await (
      await fetch(`http://127.0.0.1:${port}/products`, { headers: { authorization: `Bearer ${token}` } })
    ).json();
    const productId = products.items.find((p) => p.categoryId === "painrelief" || p.id === "p1")?.id;
    assert.ok(productId);

    await acceptArrangement(port, headers, layout.id);

    const blocked = await fetch(
      `http://127.0.0.1:${port}/layouts/${layout.id}/shelves/${unmapped.id}/planogram`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ productId, levelIndex: 0 }),
      }
    );
    assert.equal(blocked.status, 400);
    assert.equal((await blocked.json()).error, "shelf_category_required");

    await fetch(`http://127.0.0.1:${port}/layouts/${layout.id}/shelves/${unmapped.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ categoryId: "otc", color: "#0ea5e9" }),
    });
    const ok = await fetch(
      `http://127.0.0.1:${port}/layouts/${layout.id}/shelves/${unmapped.id}/planogram`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ productId, levelIndex: 0 }),
      }
    );
    assert.equal(ok.status, 201);

    const viewer = await login(port, "Viewer", "viewer@shelfpilot.local");
    const forbidden = await fetch(`http://127.0.0.1:${port}/layouts/${layout.id}/autogenerate`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${viewer}`,
      },
      body: JSON.stringify({ replaceExisting: true }),
    });
    assert.equal(forbidden.status, 403);
  });
});
