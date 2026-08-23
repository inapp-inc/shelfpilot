process.env.NODE_ENV = "test";
process.env.SQLITE_PATH = ":memory:";

import test from "node:test";
import assert from "node:assert/strict";
import { resetDbForTests } from "../src/store/sqlite.js";
import app from "../src/index.js";
import { login } from "./helpers/auth.js";

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

test("legacy public shop endpoints require login", async () => {
  await withServer(async (port) => {
    const disabled = await fetch(`http://127.0.0.1:${port}/shop/experience`);
    assert.equal(disabled.status, 401);
    assert.equal((await disabled.json()).error, "unauthorized");

    const layoutGet = await fetch(`http://127.0.0.1:${port}/shop/lay-any/layout`);
    assert.equal(layoutGet.status, 401);

    const products = await fetch(`http://127.0.0.1:${port}/shop/products`);
    assert.equal(products.status, 401);
  });
});

test("customer kiosk config requires Customer login and assigned layout", async () => {
  await withServer(async (port) => {
    const adminToken = await login(port, "Admin");
    const create = await fetch(`http://127.0.0.1:${port}/layouts`, {
      method: "POST",
      headers: { authorization: `Bearer ${adminToken}`, "content-type": "application/json" },
      body: JSON.stringify({
        name: "Shopper test store",
        vertical: "retail",
        widthMeters: 20,
        depthMeters: 15,
        heightMeters: 3,
      }),
    });
    assert.equal(create.status, 201);
    const layoutId = (await create.json()).id;

    const anon = await fetch(`http://127.0.0.1:${port}/shopper/kiosk`);
    assert.equal(anon.status, 401);

    const designer = await fetch(`http://127.0.0.1:${port}/shopper/kiosk`, {
      headers: { authorization: `Bearer ${await login(port, "Designer")}` },
    });
    assert.equal(designer.status, 403);

    await fetch(`http://127.0.0.1:${port}/admin/users`, {
      method: "POST",
      headers: { authorization: `Bearer ${adminToken}`, "content-type": "application/json" },
      body: JSON.stringify({
        email: "shopper-kiosk@test.local",
        name: "Kiosk shopper",
        role: "Customer",
        password: "password",
        shopperLayoutId: layoutId,
      }),
    });

    const customerToken = await login(port, "Customer", "shopper-kiosk@test.local");
    const assigned = await fetch(`http://127.0.0.1:${port}/shopper/kiosk`, {
      headers: { authorization: `Bearer ${customerToken}` },
    });
    assert.equal(assigned.status, 200);
    const assignedBody = await assigned.json();
    assert.equal(assignedBody.enabled, true);
    assert.equal(assignedBody.layoutId, layoutId);
    assert.equal(assignedBody.displayName, "Shopper test store");
    assert.ok(Array.isArray(assignedBody.stores));
    assert.equal(assignedBody.stores.some((s) => s.id === layoutId), true);

    await fetch(`http://127.0.0.1:${port}/admin/shopper-experience`, {
      method: "PUT",
      headers: { authorization: `Bearer ${adminToken}`, "content-type": "application/json" },
      body: JSON.stringify({
        enabled: true,
        layoutId,
        displayName: "Kiosk Store",
        entryPointId: null,
      }),
    });

    const withAdminLabel = await fetch(`http://127.0.0.1:${port}/shopper/kiosk`, {
      headers: { authorization: `Bearer ${customerToken}` },
    });
    const body = await withAdminLabel.json();
    assert.equal(withAdminLabel.status, 200);
    assert.equal(body.enabled, true);
    assert.equal(body.displayName, "Kiosk Store");
    assert.equal(body.layoutId, layoutId);
  });
});
