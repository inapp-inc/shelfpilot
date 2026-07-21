process.env.NODE_ENV = "test";
process.env.SQLITE_PATH = ":memory:";

import assert from "node:assert/strict";
import test from "node:test";
import { resetDbForTests } from "../src/store/sqlite.js";
import app from "../src/index.js";
import { defaultFixtureTypeForCategory } from "../src/services/categoryFixtureDefaults.js";
import { entityInsideLayout } from "../src/services/polygonContainment.js";
import { packAislesAndShelves } from "../src/services/layoutPacker.js";

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

async function createLayout(port, token, body) {
  const res = await fetch(`http://127.0.0.1:${port}/layouts`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const layout = await res.json();
  assert.equal(res.status, 201, JSON.stringify(layout));
  return layout;
}

test("defaultFixtureTypeForCategory maps produce to storage", () => {
  assert.equal(defaultFixtureTypeForCategory("fresh-produce", "Fresh Produce"), "storage");
  assert.equal(defaultFixtureTypeForCategory("hm-grocery", "Grocery"), "gondola");
  assert.equal(defaultFixtureTypeForCategory("seasonal", "Seasonal"), "shelf");
});

test("apply polygon preserves store envelope dimensions", async () => {
  await withServer(async (port) => {
    const token = await login(port);
    const layout = await createLayout(port, token, {
      name: "Envelope test",
      vertical: "retail",
      widthMeters: 20,
      depthMeters: 15,
    });
    assert.equal(layout.storeEnvelope.widthMeters, 20);
    assert.equal(layout.storeEnvelope.depthMeters, 15);

    const patch = await fetch(`http://127.0.0.1:${port}/layouts/${layout.id}`, {
      method: "PATCH",
      headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
      body: JSON.stringify({
        shape: "polygon",
        polygon: [
          { x: 2, y: 2 },
          { x: 12, y: 2 },
          { x: 12, y: 8 },
          { x: 2, y: 8 },
        ],
      }),
    });
    const updated = await patch.json();
    assert.equal(patch.status, 200, JSON.stringify(updated));
    assert.equal(updated.widthMeters, 20);
    assert.equal(updated.depthMeters, 15);
    assert.equal(updated.storeEnvelope.widthMeters, 20);
    assert.equal(updated.polygon.length, 4);
  });
});

test("review reject requires comment; submit blocked while unchanged in review", async () => {
  await withServer(async (port) => {
    const designer = await login(port, "Designer");
    const approver = await login(port, "Approver", "approver@shelfpilot.local");
    const layout = await createLayout(port, designer, {
      name: "Review flow",
      vertical: "retail",
      widthMeters: 10,
      depthMeters: 8,
    });

    const submit = await fetch(`http://127.0.0.1:${port}/layouts/${layout.id}/review/submit`, {
      method: "POST",
      headers: { authorization: `Bearer ${designer}` },
    });
    const submitted = await submit.json();
    assert.equal(submit.status, 200, JSON.stringify(submitted));
    assert.equal(submitted.status, "in_review");
    const revAtSubmit = submitted.contentRevision;

    const resubmit = await fetch(`http://127.0.0.1:${port}/layouts/${layout.id}/review/submit`, {
      method: "POST",
      headers: { authorization: `Bearer ${designer}` },
    });
    assert.equal(resubmit.status, 400);

    const rejectEmpty = await fetch(`http://127.0.0.1:${port}/layouts/${layout.id}/review/reject`, {
      method: "POST",
      headers: { authorization: `Bearer ${approver}`, "content-type": "application/json" },
      body: JSON.stringify({ comment: "   " }),
    });
    assert.equal(rejectEmpty.status, 400);

    const reject = await fetch(`http://127.0.0.1:${port}/layouts/${layout.id}/review/reject`, {
      method: "POST",
      headers: { authorization: `Bearer ${approver}`, "content-type": "application/json" },
      body: JSON.stringify({ comment: "Aisle spacing too tight near entry." }),
    });
    const rejected = await reject.json();
    assert.equal(reject.status, 200, JSON.stringify(rejected));
    assert.equal(rejected.status, "rejected");
    assert.match(rejected.reviewComment, /Aisle spacing/);

    const approveAfterReject = await fetch(`http://127.0.0.1:${port}/layouts/${layout.id}/review/approve`, {
      method: "POST",
      headers: { authorization: `Bearer ${approver}` },
    });
    assert.equal(approveAfterReject.status, 400);

    const resubmit2 = await fetch(`http://127.0.0.1:${port}/layouts/${layout.id}/review/submit`, {
      method: "POST",
      headers: { authorization: `Bearer ${designer}` },
    });
    assert.equal(resubmit2.status, 200);
    assert.equal(revAtSubmit, submitted.submittedRevision);
  });
});

test("L-shaped polygon autogen has zero containment violations", () => {
  const layout = {
    id: "lay-l",
    widthMeters: 20,
    depthMeters: 12,
    shape: "polygon",
    polygon: [
      { x: 0, y: 0 },
      { x: 14, y: 0 },
      { x: 14, y: 5 },
      { x: 8, y: 5 },
      { x: 8, y: 10 },
      { x: 0, y: 10 },
    ],
  };
  const packed = packAislesAndShelves(layout, { minAisleWidthMeters: 1.2, orientation: "horizontal" });
  for (const s of packed.shelves) {
    assert.equal(entityInsideLayout(s, "shelf", layout), true);
  }
  for (const a of packed.aisles) {
    assert.equal(entityInsideLayout(a, "aisle", layout), true);
  }
});
