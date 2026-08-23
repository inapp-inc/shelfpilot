process.env.NODE_ENV = "test";
process.env.SQLITE_PATH = ":memory:";

import test from "node:test";
import assert from "node:assert/strict";
import { resetDbForTests } from "../src/store/sqlite.js";
import app from "../src/index.js";
import { loginBody } from "./helpers/auth.js";

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

test("login uses stored role and ignores client role override", async () => {
  await withServer(async (port) => {
    const body = await loginBody(port, "Designer");
    assert.equal(body.user.role, "Designer");

    const badRole = await fetch(`http://127.0.0.1:${port}/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "designer@shelfpilot.local",
        password: "password",
        role: "Admin",
      }),
    });
    const badBody = await badRole.json();
    assert.equal(badRole.status, 403);
    assert.equal(badBody.error, "role_mismatch");
  });
});

test("SuperAdmin can create Admin; Admin can create Designer", async () => {
  await withServer(async (port) => {
    const superBody = await loginBody(port, "SuperAdmin");
    assert.equal(superBody.user.role, "SuperAdmin");

    const createAdmin = await fetch(`http://127.0.0.1:${port}/admin/users`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${superBody.token}`,
      },
      body: JSON.stringify({
        email: "tenant.admin@test.local",
        name: "Tenant Admin",
        role: "Admin",
        password: "password",
      }),
    });
    assert.equal(createAdmin.status, 201);

    const blockedDesigner = await fetch(`http://127.0.0.1:${port}/admin/users`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${superBody.token}`,
      },
      body: JSON.stringify({
        email: "direct.designer@test.local",
        name: "Direct Designer",
        role: "Designer",
        password: "password",
      }),
    });
    assert.equal(blockedDesigner.status, 403);

    const tenantAdmin = await loginBody(port, "Admin", "tenant.admin@test.local");
    const createDesignerRes = await fetch(`http://127.0.0.1:${port}/admin/users`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${tenantAdmin.token}`,
      },
      body: JSON.stringify({
        email: "store.designer@test.local",
        name: "Store Designer",
        role: "Designer",
        password: "password",
      }),
    });
    assert.equal(createDesignerRes.status, 201);
    const createdDesigner = await createDesignerRes.json();

    const delDesigner = await fetch(`http://127.0.0.1:${port}/admin/users/${createdDesigner.id}`, {
      method: "DELETE",
      headers: { authorization: `Bearer ${tenantAdmin.token}` },
    });
    assert.equal(delDesigner.status, 204);

    const delSelf = await fetch(`http://127.0.0.1:${port}/admin/users/${tenantAdmin.user.id}`, {
      method: "DELETE",
      headers: { authorization: `Bearer ${tenantAdmin.token}` },
    });
    assert.equal(delSelf.status, 403);
  });
});
