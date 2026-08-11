process.env.NODE_ENV = "test";
process.env.SQLITE_PATH = ":memory:";

import test from "node:test";
import assert from "node:assert/strict";
import { resetDbForTests } from "../src/store/sqlite.js";
import app from "../src/index.js";
import {
  computeFixtureDensity,
  computeFixtureMix,
  computeTemporaryStorageStats,
} from "../src/services/analyticsReports.js";
import { isTemporaryStorageShelf } from "../src/services/temporaryStorage.js";

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
  assert.equal(res.status, 200, JSON.stringify(body));
  return body.token;
}

test("temporary storage types are flagged on shelves", () => {
  assert.equal(isTemporaryStorageShelf({ type: "temp_table" }), true);
  assert.equal(isTemporaryStorageShelf({ type: "shelf", temporaryStorage: true }), true);
  assert.equal(isTemporaryStorageShelf({ type: "gondola" }), false);
});

test("analytics separates temporary storage from permanent fixtures", () => {
  const layout = {
    id: "L-temp",
    widthMeters: 10,
    depthMeters: 10,
    shelves: [
      { id: "perm", type: "shelf", widthMeters: 2, depthMeters: 1, x: 0, y: 0 },
      { id: "tbl", type: "temp_table", temporaryStorage: true, widthMeters: 1.6, depthMeters: 0.8, x: 3, y: 0 },
      { id: "pal", type: "temp_pallet", temporaryStorage: true, widthMeters: 1.2, depthMeters: 1.2, x: 5, y: 0 },
    ],
  };
  const density = computeFixtureDensity(layout);
  assert.equal(density.fixtureCount, 1);
  assert.equal(density.temporaryStorageCount, 2);

  const mix = computeFixtureMix(layout);
  assert.equal(mix.length, 1);
  assert.equal(mix[0].type, "shelf");
  assert.equal(mix[0].count, 1);

  const temp = computeTemporaryStorageStats(layout);
  assert.equal(temp.count, 2);
  assert.equal(temp.byType.length, 2);
  assert.ok(temp.areaSqm > 2);
});

test("POST shelf temp_table creates single fixture (not gondola pair)", async () => {
  await withServer(async (port) => {
    const token = await login(port);
    const headers = { "content-type": "application/json", authorization: `Bearer ${token}` };
    const layoutRes = await fetch(`http://127.0.0.1:${port}/layouts`, {
      method: "POST",
      headers,
      body: JSON.stringify({ name: "Temp Store", vertical: "retail", widthMeters: 20, depthMeters: 12 }),
    });
    assert.equal(layoutRes.status, 201);
    const layout = await layoutRes.json();

    const created = await fetch(`http://127.0.0.1:${port}/layouts/${layout.id}/shelves`, {
      method: "POST",
      headers,
      body: JSON.stringify({ type: "temp_table", widthMeters: 1.6, depthMeters: 0.8, x: 2, y: 2 }),
    });
    const createdBody = await created.json();
    assert.equal(created.status, 201, JSON.stringify(createdBody));
    const withTemp = createdBody;
    assert.equal(withTemp.shelves.length, 1);
    const shelf = withTemp.shelves[0];
    assert.equal(shelf.type, "temp_table");
    assert.equal(shelf.temporaryStorage, true);
    assert.equal(shelf.pairId, null);

    const resized = await fetch(`http://127.0.0.1:${port}/layouts/${layout.id}/shelves/${shelf.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ widthMeters: 2, depthMeters: 1 }),
    });
    assert.equal(resized.status, 200);
    const afterResize = await resized.json();
    const updated = afterResize.shelves.find((s) => s.id === shelf.id);
    assert.equal(updated.widthMeters, 2);

    const del = await fetch(`http://127.0.0.1:${port}/layouts/${layout.id}/shelves/${shelf.id}`, {
      method: "DELETE",
      headers,
    });
    assert.equal(del.status, 200);
    const afterDel = await del.json();
    assert.equal(afterDel.shelves.length, 0);
  });
});

test("regular shelf POST still creates front/back pair", async () => {
  await withServer(async (port) => {
    const token = await login(port);
    const headers = { "content-type": "application/json", authorization: `Bearer ${token}` };
    const layoutRes = await fetch(`http://127.0.0.1:${port}/layouts`, {
      method: "POST",
      headers,
      body: JSON.stringify({ name: "Pair Store", vertical: "retail", widthMeters: 20, depthMeters: 12 }),
    });
    const layout = await layoutRes.json();

    const created = await fetch(`http://127.0.0.1:${port}/layouts/${layout.id}/shelves`, {
      method: "POST",
      headers,
      body: JSON.stringify({ type: "ambient", widthMeters: 1.8, depthMeters: 0.9, x: 2, y: 2 }),
    });
    assert.equal(created.status, 201);
    const withPair = await created.json();
    assert.equal(withPair.shelves.length, 2);
    assert.ok(withPair.shelves[0].pairId);
    assert.ok(withPair.shelves.every((s) => s.pairId === withPair.shelves[0].pairId));
  });
});
