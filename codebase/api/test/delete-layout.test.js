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
    body: JSON.stringify({ name: "Doomed", vertical: "pharmacy", widthMeters: 18, depthMeters: 10 }),
  });
  assert.equal(res.status, 201);
  return res.json();
}

test("Designer deletes a layout; it disappears from the list", async () => {
  await withServer(async (port) => {
    const token = await login(port, "Designer");
    const headers = { "content-type": "application/json", authorization: `Bearer ${token}` };
    const layout = await createLayout(port, headers);

    const del = await fetch(`http://127.0.0.1:${port}/layouts/${layout.id}`, {
      method: "DELETE",
      headers,
    });
    assert.equal(del.status, 200);
    assert.equal((await del.json()).ok, true);

    const after = await fetch(`http://127.0.0.1:${port}/layouts/${layout.id}`, {
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(after.status, 404);

    const list = await (
      await fetch(`http://127.0.0.1:${port}/layouts`, { headers: { authorization: `Bearer ${token}` } })
    ).json();
    const items = list.items || list;
    assert.equal(items.some((l) => l.id === layout.id), false);
  });
});

test("delete unknown layout returns 404; Viewer forbidden", async () => {
  await withServer(async (port) => {
    const token = await login(port, "Designer");
    const headers = { "content-type": "application/json", authorization: `Bearer ${token}` };

    const missing = await fetch(`http://127.0.0.1:${port}/layouts/nope`, { method: "DELETE", headers });
    assert.equal(missing.status, 404);

    const layout = await createLayout(port, headers);
    const viewer = await login(port, "Viewer");
    const denied = await fetch(`http://127.0.0.1:${port}/layouts/${layout.id}`, {
      method: "DELETE",
      headers: { authorization: `Bearer ${viewer}` },
    });
    assert.equal(denied.status, 403);
  });
});
