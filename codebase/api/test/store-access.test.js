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

async function adminToken(port) {
  const res = await fetch(`http://127.0.0.1:${port}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "admin@shelfpilot.local", password: "password", role: "Admin" }),
  });
  const body = await res.json();
  assert.equal(res.status, 200);
  return body.token;
}

async function createLayout(port, token, name) {
  const res = await fetch(`http://127.0.0.1:${port}/layouts`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({
      name,
      vertical: "retail",
      widthMeters: 12,
      depthMeters: 10,
      heightMeters: 3,
    }),
  });
  assert.equal(res.status, 201);
  return (await res.json()).id;
}

test("GET /shopper/stores returns explicit grants only", async () => {
  await withServer(async (port) => {
    const admin = await adminToken(port);
    const layoutA = await createLayout(port, admin, "Granted A");
    const layoutB = await createLayout(port, admin, "Granted B");
    const layoutC = await createLayout(port, admin, "Blocked C");

    const createUser = await fetch(`http://127.0.0.1:${port}/admin/users`, {
      method: "POST",
      headers: { authorization: `Bearer ${admin}`, "content-type": "application/json" },
      body: JSON.stringify({
        email: "multi-store@test.local",
        name: "Multi Store",
        role: "Customer",
        password: "password",
        shopperLayoutId: layoutA,
        storeAccess: [layoutA, layoutB],
      }),
    });
    assert.equal(createUser.status, 201);

    const login = await fetch(`http://127.0.0.1:${port}/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "multi-store@test.local", password: "password", role: "Customer" }),
    });
    const token = (await login.json()).token;

    const storesRes = await fetch(`http://127.0.0.1:${port}/shopper/stores`, {
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(storesRes.status, 200);
    const stores = await storesRes.json();
    assert.deepEqual(
      (stores.items || []).map((s) => s.id).sort(),
      [layoutA, layoutB].sort()
    );
    assert.equal(stores.defaultStoreId, layoutA);

    const blocked = await fetch(`http://127.0.0.1:${port}/layouts/${layoutC}`, {
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(blocked.status, 403);
  });
});

test("kiosk rejects layoutId outside grants", async () => {
  await withServer(async (port) => {
    const admin = await adminToken(port);
    const layoutA = await createLayout(port, admin, "Home store");
    const layoutB = await createLayout(port, admin, "Other store");

    await fetch(`http://127.0.0.1:${port}/admin/users`, {
      method: "POST",
      headers: { authorization: `Bearer ${admin}`, "content-type": "application/json" },
      body: JSON.stringify({
        email: "single-store@test.local",
        name: "Single Store",
        role: "Customer",
        password: "password",
        shopperLayoutId: layoutA,
        storeAccess: [layoutA],
      }),
    });

    const login = await fetch(`http://127.0.0.1:${port}/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "single-store@test.local", password: "password", role: "Customer" }),
    });
    const token = (await login.json()).token;

    const denied = await fetch(`http://127.0.0.1:${port}/shopper/kiosk?layoutId=${layoutB}`, {
      headers: { authorization: `Bearer ${token}` },
    });
    const body = await denied.json();
    assert.equal(denied.status, 200);
    assert.equal(body.enabled, false);
    assert.equal(body.reason, "forbidden");
  });
});
