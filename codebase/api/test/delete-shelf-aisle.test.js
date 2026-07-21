process.env.NODE_ENV = "test";
process.env.SQLITE_PATH = ":memory:";

import test from "node:test";
import assert from "node:assert/strict";
import { resetDbForTests } from "../src/store/sqlite.js";
import app from "../src/index.js";

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

async function createLayout(port, headers) {
  const res = await fetch(`http://127.0.0.1:${port}/layouts`, {
    method: "POST",
    headers,
    body: JSON.stringify({ name: "Del Store", vertical: "pharmacy", widthMeters: 20, depthMeters: 12 }),
  });
  assert.equal(res.status, 201);
  return res.json();
}

test("delete shelf removes shelf and its mapping", async () => {
  await withServer(async (port) => {
    const token = await login(port, "Designer");
    const headers = { "content-type": "application/json", authorization: `Bearer ${token}` };
    const layout = await createLayout(port, headers);

    const created = await fetch(`http://127.0.0.1:${port}/layouts/${layout.id}/shelves`, {
      method: "POST",
      headers,
      body: JSON.stringify({ type: "shelf", widthMeters: 1.2, depthMeters: 0.6, x: 1, y: 1 }),
    });
    const withShelf = await created.json();
    const shelfId = withShelf.shelves[0].id;

    await fetch(`http://127.0.0.1:${port}/layouts/${layout.id}/mappings`, {
      method: "POST",
      headers,
      body: JSON.stringify({ shelfId, categoryId: "otc", color: "#0ea5e9" }),
    });

    const del = await fetch(`http://127.0.0.1:${port}/layouts/${layout.id}/shelves/${shelfId}`, {
      method: "DELETE",
      headers,
    });
    assert.equal(del.status, 200);
    const after = await del.json();
    assert.equal((after.shelves || []).some((s) => s.id === shelfId), false);
    assert.equal((after.shelfMappings || []).some((m) => m.shelfId === shelfId), false);
  });
});

test("delete aisle removes aisle, its mapping, and detaches shelves", async () => {
  await withServer(async (port) => {
    const token = await login(port, "Designer");
    const headers = { "content-type": "application/json", authorization: `Bearer ${token}` };
    const layout = await createLayout(port, headers);

    const aisleRes = await fetch(`http://127.0.0.1:${port}/layouts/${layout.id}/aisles`, {
      method: "POST",
      headers,
      body: JSON.stringify({ name: "Main", widthMeters: 1.5, x: 1, y: 1 }),
    });
    const withAisle = await aisleRes.json();
    const aisleId = withAisle.aisles[0].id;

    const shelfRes = await fetch(`http://127.0.0.1:${port}/layouts/${layout.id}/shelves`, {
      method: "POST",
      headers,
      body: JSON.stringify({ type: "shelf", widthMeters: 1.2, depthMeters: 0.6, x: 2, y: 2 }),
    });
    const withShelf = await shelfRes.json();
    const shelfId = withShelf.shelves[0].id;

    await fetch(`http://127.0.0.1:${port}/layouts/${layout.id}/shelves/${shelfId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ aisleId }),
    });
    await fetch(`http://127.0.0.1:${port}/layouts/${layout.id}/mappings`, {
      method: "POST",
      headers,
      body: JSON.stringify({ aisleId, categoryId: "otc", color: "#16a34a" }),
    });

    const del = await fetch(`http://127.0.0.1:${port}/layouts/${layout.id}/aisles/${aisleId}`, {
      method: "DELETE",
      headers,
    });
    assert.equal(del.status, 200);
    const after = await del.json();
    assert.equal((after.aisles || []).some((a) => a.id === aisleId), false);
    assert.equal((after.aisleMappings || []).some((m) => m.aisleId === aisleId), false);
    const shelf = (after.shelves || []).find((s) => s.id === shelfId);
    assert.ok(shelf, "shelf should still exist");
    assert.equal(shelf.aisleId ?? null, null, "shelf aisleId should be detached");
  });
});

test("delete unknown shelf/aisle returns 404; Viewer forbidden", async () => {
  await withServer(async (port) => {
    const token = await login(port, "Designer");
    const headers = { "content-type": "application/json", authorization: `Bearer ${token}` };
    const layout = await createLayout(port, headers);

    const missingShelf = await fetch(`http://127.0.0.1:${port}/layouts/${layout.id}/shelves/nope`, {
      method: "DELETE",
      headers,
    });
    assert.equal(missingShelf.status, 404);
    assert.equal((await missingShelf.json()).error, "shelf_not_found");

    const missingAisle = await fetch(`http://127.0.0.1:${port}/layouts/${layout.id}/aisles/nope`, {
      method: "DELETE",
      headers,
    });
    assert.equal(missingAisle.status, 404);
    assert.equal((await missingAisle.json()).error, "aisle_not_found");

    const viewer = await login(port, "Viewer", "viewer@shelfpilot.local");
    const denied = await fetch(`http://127.0.0.1:${port}/layouts/${layout.id}/shelves/whatever`, {
      method: "DELETE",
      headers: { authorization: `Bearer ${viewer}` },
    });
    assert.equal(denied.status, 403);
  });
});
