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

async function login(port, role = "Customer", email = "customer@shelfpilot.local") {
  const res = await fetch(`http://127.0.0.1:${port}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email, password: "password", role }),
  });
  const body = await res.json();
  assert.equal(res.status, 200, JSON.stringify(body));
  return body.token;
}

test("Customer role can read layouts and catalog but cannot mutate layout", async () => {
  await withServer(async (port) => {
    const token = await login(port, "Customer");
    const headers = { authorization: `Bearer ${token}` };

    const layoutsRes = await fetch(`http://127.0.0.1:${port}/layouts`, { headers });
    assert.equal(layoutsRes.status, 200);

    const categoriesRes = await fetch(`http://127.0.0.1:${port}/categories?vertical=retail`, { headers });
    assert.equal(categoriesRes.status, 200);

    const productsRes = await fetch(`http://127.0.0.1:${port}/products?vertical=retail`, { headers });
    assert.equal(productsRes.status, 200);

    const createRes = await fetch(`http://127.0.0.1:${port}/layouts`, {
      method: "POST",
      headers: { ...headers, "content-type": "application/json" },
      body: JSON.stringify({ name: "Customer blocked", vertical: "retail", widthMeters: 10, depthMeters: 10 }),
    });
    assert.equal(createRes.status, 403);
  });
});

test("Customer user requires shopper layout on create", async () => {
  await withServer(async (port) => {
    const adminToken = await fetch(`http://127.0.0.1:${port}/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "admin@shelfpilot.local", password: "password", role: "Admin" }),
    }).then((r) => r.json()).then((b) => b.token);

    const createLayout = await fetch(`http://127.0.0.1:${port}/layouts`, {
      method: "POST",
      headers: { authorization: `Bearer ${adminToken}`, "content-type": "application/json" },
      body: JSON.stringify({
        name: "Customer store",
        vertical: "retail",
        widthMeters: 12,
        depthMeters: 10,
        heightMeters: 3,
      }),
    });
    const layoutId = (await createLayout.json()).id;

    const missingLayout = await fetch(`http://127.0.0.1:${port}/admin/users`, {
      method: "POST",
      headers: { authorization: `Bearer ${adminToken}`, "content-type": "application/json" },
      body: JSON.stringify({
        email: "shopper1@test.local",
        name: "Shopper One",
        role: "Customer",
        password: "password",
      }),
    });
    assert.equal(missingLayout.status, 400);
    assert.equal((await missingLayout.json()).error, "shopper_layout_required");

    const created = await fetch(`http://127.0.0.1:${port}/admin/users`, {
      method: "POST",
      headers: { authorization: `Bearer ${adminToken}`, "content-type": "application/json" },
      body: JSON.stringify({
        email: "shopper1@test.local",
        name: "Shopper One",
        role: "Customer",
        password: "password",
        shopperLayoutId: layoutId,
      }),
    });
    assert.equal(created.status, 201);
    const user = await created.json();
    assert.equal(user.shopperLayoutId, layoutId);

    const login = await fetch(`http://127.0.0.1:${port}/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "shopper1@test.local", password: "password", role: "Customer" }),
    });
    const loginBody = await login.json();
    assert.equal(loginBody.user.shopperLayoutId, layoutId);
  });
});

test("Customer can only read the assigned shopper layout", async () => {
  await withServer(async (port) => {
    const adminToken = await fetch(`http://127.0.0.1:${port}/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: "admin@shelfpilot.local", password: "password", role: "Admin" }),
    }).then((r) => r.json()).then((b) => b.token);

    const createA = await fetch(`http://127.0.0.1:${port}/layouts`, {
      method: "POST",
      headers: { authorization: `Bearer ${adminToken}`, "content-type": "application/json" },
      body: JSON.stringify({
        name: "Assigned store",
        vertical: "retail",
        widthMeters: 12,
        depthMeters: 10,
        heightMeters: 3,
      }),
    });
    const layoutA = (await createA.json()).id;

    const createB = await fetch(`http://127.0.0.1:${port}/layouts`, {
      method: "POST",
      headers: { authorization: `Bearer ${adminToken}`, "content-type": "application/json" },
      body: JSON.stringify({
        name: "Other store",
        vertical: "retail",
        widthMeters: 12,
        depthMeters: 10,
        heightMeters: 3,
      }),
    });
    const layoutB = (await createB.json()).id;

    await fetch(`http://127.0.0.1:${port}/admin/users`, {
      method: "POST",
      headers: { authorization: `Bearer ${adminToken}`, "content-type": "application/json" },
      body: JSON.stringify({
        email: "shopper-only@test.local",
        name: "Shopper Only",
        role: "Customer",
        password: "password",
        shopperLayoutId: layoutA,
      }),
    });

    const token = await login(port, "Customer", "shopper-only@test.local");
    const headers = { authorization: `Bearer ${token}` };

    const list = await fetch(`http://127.0.0.1:${port}/layouts`, { headers });
    assert.equal(list.status, 200);
    const items = (await list.json()).items || [];
    assert.equal(items.length, 1);
    assert.equal(items[0].id, layoutA);

    const own = await fetch(`http://127.0.0.1:${port}/layouts/${layoutA}?include=planograms`, { headers });
    assert.equal(own.status, 200);

    const other = await fetch(`http://127.0.0.1:${port}/layouts/${layoutB}`, { headers });
    assert.equal(other.status, 403);
  });
});

test("login accepts Customer role", async () => {
  await withServer(async (port) => {
    const token = await login(port, "Customer");
    assert.ok(token);
    const me = await fetch(`http://127.0.0.1:${port}/auth/me`, {
      headers: { authorization: `Bearer ${token}` },
    });
    const body = await me.json();
    assert.equal(body.role, "Customer");
  });
});
