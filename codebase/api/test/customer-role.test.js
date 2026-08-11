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
