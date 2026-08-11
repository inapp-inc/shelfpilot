process.env.NODE_ENV = "test";
process.env.SQLITE_PATH = ":memory:";

import test from "node:test";
import assert from "node:assert/strict";
import { resetDbForTests } from "../src/store/sqlite.js";
import app from "../src/index.js";
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

test("GET /health returns ok", async () => {
  await withServer(async (port) => {
    const res = await fetch(`http://127.0.0.1:${port}/health`);
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.ok, true);
    assert.ok(body.correlationId);
  });
});

test("login issues token and Viewer cannot mutate layout", async () => {
  await withServer(async (port) => {
    const viewerToken = await login(port, "Viewer");
    const res = await fetch(`http://127.0.0.1:${port}/layouts`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${viewerToken}`,
      },
      body: JSON.stringify({
        name: "Blocked",
        vertical: "retail",
        widthMeters: 20,
        depthMeters: 15,
      }),
    });
    assert.equal(res.status, 403);
  });
});

test("logout revokes token", async () => {
  await withServer(async (port) => {
    const token = await login(port, "Designer");
    const out = await fetch(`http://127.0.0.1:${port}/auth/logout`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(out.status, 204);
    const me = await fetch(`http://127.0.0.1:${port}/auth/me`, {
      headers: { authorization: `Bearer ${token}` },
    });
    assert.equal(me.status, 401);
  });
});

test("expired session returns 401 when AUTH_SESSION_TTL is short", async () => {
  process.env.AUTH_SESSION_TTL = "1";
  try {
    await withServer(async (port) => {
      const token = await login(port, "Designer");
      await new Promise((r) => setTimeout(r, 1100));
      const me = await fetch(`http://127.0.0.1:${port}/auth/me`, {
        headers: { authorization: `Bearer ${token}` },
      });
      assert.equal(me.status, 401);
    });
  } finally {
    delete process.env.AUTH_SESSION_TTL;
  }
});

test("create layout, aisle violation, fixture, mapping, analytics", async () => {
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
        name: "Demo Store",
        vertical: "pharmacy",
        widthMeters: 20,
        depthMeters: 12,
      }),
    });
    assert.equal(create.status, 201);
    const layout = await create.json();
    assert.ok(layout.autoCalc.maxFixtures > 0);

    const aisle = await fetch(`http://127.0.0.1:${port}/layouts/${layout.id}/aisles`, {
      method: "POST",
      headers,
      body: JSON.stringify({ name: "Main", widthMeters: 0.8 }),
    });
    const withAisle = await aisle.json();
    assert.ok(withAisle.validation.aisleViolations.length > 0);

    const before = withAisle.autoCalc.maxFixtures;
    const patched = await fetch(`http://127.0.0.1:${port}/layouts/${layout.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ widthMeters: 40 }),
    });
    const grown = await patched.json();
    assert.ok(grown.autoCalc.maxFixtures > before);

    const fx = await fetch(`http://127.0.0.1:${port}/layouts/${layout.id}/fixtures`, {
      method: "POST",
      headers,
      body: JSON.stringify({ type: "shelf", widthMeters: 1, depthMeters: 0.5, x: 1, y: 1 }),
    });
    const withFx = await fx.json();
    const fixtureId = withFx.fixtures[0].id;

    const moved = await fetch(
      `http://127.0.0.1:${port}/layouts/${layout.id}/fixtures/${fixtureId}`,
      {
        method: "PATCH",
        headers,
        body: JSON.stringify({ x: 2.5, y: 3 }),
      }
    );
    const afterMove = await moved.json();
    assert.equal(afterMove.fixtures[0].x, 2.5);

    const mapped = await fetch(`http://127.0.0.1:${port}/layouts/${layout.id}/mappings`, {
      method: "POST",
      headers,
      body: JSON.stringify({ fixtureId, categoryId: "otc", color: "#0ea5e9" }),
    });
    assert.equal(mapped.status, 201);

    const summary = await fetch(`http://127.0.0.1:${port}/analytics/layouts/${layout.id}/summary`, {
      headers: { authorization: `Bearer ${token}` },
    });
    const s = await summary.json();
    assert.equal(s.fixtureCount, 1);
    assert.ok(s.allocationByCategory.length >= 1);
  });
});

test("admin config put forbidden for Designer; pharmacy vs apparel differ", async () => {
  await withServer(async (port) => {
    const designer = await login(port, "Designer");
    const denied = await fetch(`http://127.0.0.1:${port}/admin/config`, {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${designer}`,
      },
      body: JSON.stringify({ vertical: "pharmacy", minAisleWidthMeters: 9 }),
    });
    assert.equal(denied.status, 403);

    const token = await login(port, "Admin", "admin@shelfpilot.local");
    const ph = await fetch(`http://127.0.0.1:${port}/admin/config?vertical=pharmacy`, {
      headers: { authorization: `Bearer ${token}` },
    });
    const pharmacy = await ph.json();
    const ap = await fetch(`http://127.0.0.1:${port}/admin/config?vertical=apparel`, {
      headers: { authorization: `Bearer ${token}` },
    });
    const apparel = await ap.json();
    assert.notEqual(pharmacy.minAisleWidthMeters, apparel.minAisleWidthMeters);

    const put = await fetch(`http://127.0.0.1:${port}/admin/config`, {
      method: "PUT",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        ...pharmacy,
        minAisleWidthMeters: 1.7,
      }),
    });
    assert.equal(put.status, 200);
    const again = await (
      await fetch(`http://127.0.0.1:${port}/admin/config?vertical=pharmacy`, {
        headers: { authorization: `Bearer ${token}` },
      })
    ).json();
    assert.equal(again.minAisleWidthMeters, 1.7);
  });
});

test("admin can create user who can login", async () => {
  await withServer(async (port) => {
    const admin = await login(port, "Admin", "admin@shelfpilot.local");
    const created = await fetch(`http://127.0.0.1:${port}/admin/users`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${admin}`,
      },
      body: JSON.stringify({
        email: "new.designer@shelfpilot.local",
        name: "New Designer",
        role: "Designer",
        password: "password",
      }),
    });
    assert.equal(created.status, 201);
    const loginRes = await fetch(`http://127.0.0.1:${port}/auth/login`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: "new.designer@shelfpilot.local",
        password: "password",
        role: "Designer",
      }),
    });
    assert.equal(loginRes.status, 200);
  });
});

test("submit for review creates version snapshot", async () => {
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
        name: "Versioned",
        vertical: "retail",
        widthMeters: 10,
        depthMeters: 8,
      }),
    });
    const layout = await create.json();
    await fetch(`http://127.0.0.1:${port}/layouts/${layout.id}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ status: "in_review" }),
    });
    const versions = await fetch(`http://127.0.0.1:${port}/layouts/${layout.id}/versions`, {
      headers: { authorization: `Bearer ${token}` },
    });
    const body = await versions.json();
    assert.ok(body.items.length >= 1);
  });
});

test("catalog export and import", async () => {
  await withServer(async (port) => {
    const token = await login(port, "Admin", "admin@shelfpilot.local");
    const headers = {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    };
    const exp = await fetch(`http://127.0.0.1:${port}/catalog/export?vertical=pharmacy`, {
      headers: { authorization: `Bearer ${token}` },
    });
    const data = await exp.json();
    assert.ok(data.categories.length > 0);
    const imp = await fetch(`http://127.0.0.1:${port}/catalog/import`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        categories: [{ id: "demo-cat", name: "Demo Cat", vertical: "retail", color: "#111" }],
        products: [{ id: "demo-prd", name: "Demo SKU", categoryId: "demo-cat", sku: "D-1" }],
      }),
    });
    assert.equal(imp.status, 200);
  });
});

test("legacy fixtures synthesize shelves on GET; shelf planogram facings clamp", async () => {
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
        name: "Planogram Store",
        vertical: "pharmacy",
        widthMeters: 20,
        depthMeters: 12,
      }),
    });
    const layout = await create.json();
    const fx = await fetch(`http://127.0.0.1:${port}/layouts/${layout.id}/fixtures`, {
      method: "POST",
      headers,
      body: JSON.stringify({ type: "shelf", widthMeters: 1.2, depthMeters: 0.5, x: 1, y: 1, heightMeters: 2 }),
    });
    const withFx = await fx.json();
    assert.ok(withFx.shelves?.length >= 1);
    assert.equal(withFx.shelves[0].usableWidthMeters, 1.2);

    const shelfId = withFx.shelves[0].id;
    await fetch(`http://127.0.0.1:${port}/layouts/${layout.id}/aisles`, {
      method: "POST",
      headers,
      body: JSON.stringify({ name: "Main", widthMeters: 1.6, x: 10, y: 8 }),
    });
    const aislePatched = await fetch(
      `http://127.0.0.1:${port}/layouts/${layout.id}/aisles/${(await (await fetch(`http://127.0.0.1:${port}/layouts/${layout.id}`, { headers: { authorization: `Bearer ${token}` } })).json()).aisles[0].id}`,
      {
        method: "PATCH",
        headers,
        body: JSON.stringify({ widthMeters: 1.7, categoryId: "otc", color: "#0ea5e9" }),
      }
    );
    const afterAisle = await aislePatched.json();
    assert.equal(afterAisle.aisles[0].widthMeters, 1.7);
    assert.ok(afterAisle.aisleMappings?.length >= 1);

    await fetch(`http://127.0.0.1:${port}/layouts/${layout.id}/shelves/${shelfId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        heightMeters: 2.1,
        usableWidthMeters: 1.2,
        levels: [
          { levelIndex: 0, heightFromFloorMeters: 0.3, clearanceMeters: 0.35 },
          { levelIndex: 1, heightFromFloorMeters: 1.0, clearanceMeters: 0.35 },
        ],
        categoryId: "otc",
        color: "#0ea5e9",
      }),
    });

    const products = await (
      await fetch(`http://127.0.0.1:${port}/products`, { headers: { authorization: `Bearer ${token}` } })
    ).json();
    const productId = products.items[0].id;

    const preview = await fetch(`http://127.0.0.1:${port}/layouts/${layout.id}/planogram/preview`, {
      method: "POST",
      headers,
      body: JSON.stringify({ shelfId, productId, levelIndex: 0 }),
    });
    assert.equal(preview.status, 200);
    const prevBody = await preview.json();
    assert.ok(prevBody.maxFacings >= 1);

    await acceptArrangement(port, headers, layout.id);

    const pog = await fetch(`http://127.0.0.1:${port}/layouts/${layout.id}/shelves/${shelfId}/planogram`, {
      method: "POST",
      headers,
      body: JSON.stringify({ productId, levelIndex: 0, facings: 99 }),
    });
    assert.equal(pog.status, 201);
    const withPog = await pog.json();
    const placement = withPog.shelves.find((s) => s.id === shelfId).planogram[0];
    assert.ok(placement.facings <= placement.maxFacings);
    assert.equal(placement.facings, placement.maxFacings);

    const viewer = await login(port, "Viewer");
    const denied = await fetch(`http://127.0.0.1:${port}/layouts/${layout.id}/shelves/${shelfId}/planogram`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${viewer}`,
      },
      body: JSON.stringify({ productId, levelIndex: 0 }),
    });
    assert.equal(denied.status, 403);
  });
});
