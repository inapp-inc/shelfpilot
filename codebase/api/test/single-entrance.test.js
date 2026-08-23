process.env.NODE_ENV = "test";
process.env.SQLITE_PATH = ":memory:";

import test from "node:test";
import assert from "node:assert/strict";
import { resetDbForTests, repo, getDb } from "../src/store/sqlite.js";
import app from "../src/index.js";
import { login } from "./helpers/auth.js";
import { normalizeLayout } from "../src/services/layoutNormalize.js";
import { normalizeEntryPoint, canonicalizeEntryPoints } from "../src/services/zones.js";
import { assumeEntranceSpace, resolveShopperEntry } from "../../web/src/shopper/shopperWayfinding.js";

const RECT = {
  widthMeters: 14,
  depthMeters: 12,
  shape: "polygon",
  polygon: [
    { x: 0, y: 0 },
    { x: 14, y: 0 },
    { x: 14, y: 12 },
    { x: 0, y: 12 },
  ],
};

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

test("normalizeEntryPoint accepts legacy label as name", () => {
  const entry = normalizeEntryPoint({ id: "e1", x: 1, y: 2, label: "Main door" });
  assert.equal(entry.name, "Main door");
});

test("canonicalizeEntryPoints keeps the first entrance only", () => {
  const layout = {
    entryPoints: [
      { id: "keep", name: "Front", x: 1, y: 1 },
      { id: "drop-a", name: "Side", x: 2, y: 2 },
      { id: "drop-b", name: "Back", x: 3, y: 3 },
    ],
  };
  assert.equal(canonicalizeEntryPoints(layout), 2);
  assert.equal(layout.entryPoints.length, 1);
  assert.equal(layout.entryPoints[0].id, "keep");
});

test("normalizeLayout trims legacy multi-entrance layouts on save", () => {
  const layout = normalizeLayout({
    id: "legacy-multi",
    name: "Legacy",
    vertical: "retail",
    status: "draft",
    ...RECT,
    entryPoints: [
      { id: "e1", x: 1, y: 1, label: "A" },
      { id: "e2", x: 2, y: 2, label: "B" },
      { id: "e3", x: 3, y: 3, label: "C" },
    ],
  });
  assert.equal(layout.entryPoints.length, 1);
  assert.equal(layout.entryPoints[0].id, "e1");
  assert.equal(layout._entranceTrimmed, 2);
});

test("entranceless layout still assumes a front plaza for routing", () => {
  const layout = { widthMeters: 20, depthMeters: 16, aisles: [], shelves: [], entryPoints: [] };
  const entry = resolveShopperEntry(layout, null);
  assert.equal(entry.assumed, true);
  assert.ok(assumeEntranceSpace(layout).plaza);
});

test("POST entry-points replaces instead of appending", async () => {
  await withServer(async (port) => {
    const token = await login(port, "Designer");
    const createLayout = await fetch(`http://127.0.0.1:${port}/layouts`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({
        name: "Single entrance test",
        vertical: "retail",
        widthMeters: 14,
        depthMeters: 12,
        heightMeters: 3,
      }),
    });
    assert.equal(createLayout.status, 201);
    const layoutId = (await createLayout.json()).id;

    const first = await fetch(`http://127.0.0.1:${port}/layouts/${layoutId}/entry-points`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ x: 2, y: 1, name: "Front door", widthMeters: 1.8 }),
    });
    assert.equal(first.status, 201);
    const firstBody = await first.json();
    assert.equal(firstBody.entryPoints.length, 1);
    const firstId = firstBody.entryPoints[0].id;
    assert.equal(firstBody.entryPoints[0].name, "Front door");

    const second = await fetch(`http://127.0.0.1:${port}/layouts/${layoutId}/entry-points`, {
      method: "POST",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({ x: 8, y: 1, name: "Moved door", widthMeters: 2 }),
    });
    assert.equal(second.status, 200);
    const secondBody = await second.json();
    assert.equal(secondBody.entryPoints.length, 1);
    assert.equal(secondBody.entryPoints[0].id, firstId);
    assert.equal(secondBody.entryPoints[0].name, "Moved door");
    assert.equal(secondBody.entryPoints[0].x, 8);
  });
});

test("saveLayout persists trimmed single entrance", () => {
  resetDbForTests();
  getDb();
  const layout = normalizeLayout({
    id: "trim-save",
    name: "Trim save",
    vertical: "retail",
    status: "draft",
    ...RECT,
    entryPoints: [
      normalizeEntryPoint({ id: "entry-1", x: 1, y: 1 }),
      normalizeEntryPoint({ id: "entry-2", x: 2, y: 2 }),
    ],
  });
  delete layout._entranceTrimmed;
  repo.saveLayout(layout);
  const loaded = repo.getLayout("trim-save");
  normalizeLayout(loaded);
  assert.equal(loaded.entryPoints.length, 1);
  assert.equal(loaded.entryPoints[0].id, "entry-1");
});
