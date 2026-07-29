process.env.NODE_ENV = "test";
process.env.SQLITE_PATH = ":memory:";

import test from "node:test";
import assert from "node:assert/strict";
import { resetDbForTests } from "../src/store/sqlite.js";
import app from "../src/index.js";
import {
  computeSuggestedDepthFacings,
  previewFacings,
} from "../src/services/planogramMath.js";
import { normalizeShelf, setFaceCategory, faceCategoryId } from "../src/services/shelfFaces.js";

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

async function login(port) {
  const res = await fetch(`http://127.0.0.1:${port}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "designer@shelfpilot.local", password: "password", role: "Designer" }),
  });
  const body = await res.json();
  assert.equal(res.status, 200);
  return body.token;
}

test("computeSuggestedDepthFacings floors shelf depth / product depth", () => {
  assert.equal(computeSuggestedDepthFacings(0.6, 0.2), 3);
  assert.equal(computeSuggestedDepthFacings(0.5, 0.25), 2);
});

test("previewFacings returns maxDepthFacings and suggestedLevels", () => {
  const preview = previewFacings({
    shelf: { id: "s1", usableWidthMeters: 1.2, depthMeters: 0.6, heightMeters: 2 },
    product: {
      id: "p1",
      attributes: { widthMeters: 0.2, heightMeters: 0.4, depthMeters: 0.2 },
    },
  });
  assert.equal(preview.maxFacings, 6);
  assert.equal(preview.maxDepthFacings, 3);
  assert.equal(preview.suggestedLevels, 5);
  assert.equal(preview.assumedDimensions, false);
});

test("storage shelf normalizes as doubleSided with two faces", () => {
  const shelf = normalizeShelf({ id: "st1", type: "storage" });
  assert.equal(shelf.doubleSided, true);
  assert.equal(shelf.faces.length, 2);
});

test("Face B category mapping is independent of Face A", () => {
  const shelf = normalizeShelf({ id: "g1", type: "gondola" });
  setFaceCategory(shelf, "A", "grocery", "#16a34a");
  setFaceCategory(shelf, "B", "chilled", "#0ea5e9");
  assert.equal(faceCategoryId(shelf, "A"), "grocery");
  assert.equal(faceCategoryId(shelf, "B"), "chilled");
});

test("POST mappings with faceId B updates Face B only", async () => {
  await withServer(async (port) => {
    const token = await login(port);
    const headers = {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    };
    const create = await fetch(`http://127.0.0.1:${port}/layouts`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: "Dual face",
        vertical: "pharmacy",
        widthMeters: 20,
        depthMeters: 12,
      }),
    });
    const layout = await create.json();
    const fx = await fetch(`http://127.0.0.1:${port}/layouts/${layout.id}/fixtures`, {
      method: "POST",
      headers,
      body: JSON.stringify({ type: "storage", widthMeters: 1.2, depthMeters: 0.6, x: 1, y: 1, heightMeters: 2 }),
    });
    const withFx = await fx.json();
    const shelfId = withFx.shelves[0].id;
    assert.equal(withFx.shelves[0].doubleSided, true);

    await fetch(`http://127.0.0.1:${port}/layouts/${layout.id}/mappings`, {
      method: "POST",
      headers,
      body: JSON.stringify({ shelfId, categoryId: "otc", color: "#0ea5e9", faceId: "A" }),
    });
    await fetch(`http://127.0.0.1:${port}/layouts/${layout.id}/mappings`, {
      method: "POST",
      headers,
      body: JSON.stringify({ shelfId, categoryId: "vitamins", color: "#16a34a", faceId: "B" }),
    });

    const got = await (
      await fetch(`http://127.0.0.1:${port}/layouts/${layout.id}`, {
        headers: { authorization: `Bearer ${token}` },
      })
    ).json();
    const shelf = got.shelves.find((s) => s.id === shelfId);
    const faceA = shelf.faces.find((f) => f.id === "A");
    const faceB = shelf.faces.find((f) => f.id === "B");
    assert.equal(faceA.categoryId, "otc");
    assert.equal(faceB.categoryId, "vitamins");
  });
});

test("planogram preview includes maxDepthFacings via API", async () => {
  await withServer(async (port) => {
    const token = await login(port);
    const headers = {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    };
    const create = await fetch(`http://127.0.0.1:${port}/layouts`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: "Preview depth",
        vertical: "pharmacy",
        widthMeters: 20,
        depthMeters: 12,
      }),
    });
    const layout = await create.json();
    const fx = await fetch(`http://127.0.0.1:${port}/layouts/${layout.id}/fixtures`, {
      method: "POST",
      headers,
      body: JSON.stringify({ type: "shelf", widthMeters: 1.2, depthMeters: 0.6, x: 1, y: 1, heightMeters: 2 }),
    });
    const withFx = await fx.json();
    const shelfId = withFx.shelves[0].id;

    await fetch(`http://127.0.0.1:${port}/layouts/${layout.id}/mappings`, {
      method: "POST",
      headers,
      body: JSON.stringify({ shelfId, categoryId: "otc", color: "#0ea5e9", faceId: "A" }),
    });

    const prod = await fetch(`http://127.0.0.1:${port}/products`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: "Box",
        sku: "BOX-1",
        categoryId: "otc",
        attributes: { widthMeters: 0.2, heightMeters: 0.4, depthMeters: 0.2 },
      }),
    });
    const product = await prod.json();

    const preview = await fetch(`http://127.0.0.1:${port}/layouts/${layout.id}/planogram/preview`, {
      method: "POST",
      headers,
      body: JSON.stringify({ shelfId, productId: product.id, levelIndex: 0 }),
    });
    assert.equal(preview.status, 200);
    const body = await preview.json();
    assert.equal(body.maxFacings, 6);
    assert.equal(body.maxDepthFacings, 3);
    assert.equal(body.suggestedLevels, 5);
  });
});

test("planogram POST stores depthFacings; preview accepts segmentId", async () => {
  await withServer(async (port) => {
    const token = await login(port);
    const headers = {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    };
    const create = await fetch(`http://127.0.0.1:${port}/layouts`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: "Segment depth",
        vertical: "pharmacy",
        widthMeters: 20,
        depthMeters: 12,
      }),
    });
    const layout = await create.json();
    const fx = await fetch(`http://127.0.0.1:${port}/layouts/${layout.id}/fixtures`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        type: "storage",
        widthMeters: 3.6,
        depthMeters: 0.6,
        x: 1,
        y: 1,
        heightMeters: 2,
      }),
    });
    const withFx = await fx.json();
    const shelfId = withFx.shelves[0].id;

    await fetch(`http://127.0.0.1:${port}/layouts/${layout.id}/mappings`, {
      method: "POST",
      headers,
      body: JSON.stringify({ shelfId, categoryId: "otc", color: "#0ea5e9", faceId: "A" }),
    });

    const split = await fetch(`http://127.0.0.1:${port}/layouts/${layout.id}/shelves/${shelfId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({
        segments: [
          { id: "seg-a", offsetMeters: 0, widthMeters: 1.2, fillMode: "full" },
          { id: "seg-b", offsetMeters: 1.2, widthMeters: 2.4, fillMode: "full" },
        ],
      }),
    });
    const splitLayout = await split.json();
    const splitShelf = splitLayout.shelves.find((s) => s.id === shelfId);
    const segA = splitShelf.faces.find((f) => f.id === "A").segments[0];

    const prod = await fetch(`http://127.0.0.1:${port}/products`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        name: "Deep box",
        sku: "DBOX-1",
        categoryId: "otc",
        attributes: { widthMeters: 0.2, heightMeters: 0.4, depthMeters: 0.2 },
      }),
    });
    const product = await prod.json();

    const preview = await fetch(`http://127.0.0.1:${port}/layouts/${layout.id}/planogram/preview`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        shelfId,
        productId: product.id,
        levelIndex: 0,
        segmentId: segA.id,
        faceId: "A",
      }),
    });
    assert.equal(preview.status, 200);
    const previewBody = await preview.json();
    assert.equal(previewBody.maxFacings, 6);

    const pog = await fetch(`http://127.0.0.1:${port}/layouts/${layout.id}/shelves/${shelfId}/planogram`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        productId: product.id,
        levelIndex: 0,
        segmentId: segA.id,
        faceId: "A",
        facings: 4,
        depthFacings: 2,
      }),
    });
    assert.equal(pog.status, 201);
    const withPog = await pog.json();
    const faceA = withPog.shelves.find((s) => s.id === shelfId).faces.find((f) => f.id === "A");
    const placement = faceA.planogram[0];
    assert.equal(placement.facings, 4);
    assert.equal(placement.depthFacings, 2);
    assert.equal(placement.maxDepthFacings, 3);
    assert.equal(placement.segmentId, segA.id);
  });
});
