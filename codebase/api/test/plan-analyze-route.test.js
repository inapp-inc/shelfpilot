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

async function login(port) {
  const res = await fetch(`http://127.0.0.1:${port}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "designer@shelfpilot.local", password: "password", role: "Designer" }),
  });
  const body = await res.json();
  assert.equal(res.status, 200, JSON.stringify(body));
  return body.token;
}

test("POST /layouts/analyze-plan parses text upload", async () => {
  await withServer(async (port) => {
    const token = await login(port);
    const text = Buffer.from("Scale 1:50\nAMBIENT 9m\nAMBIENT 10m", "utf8").toString("base64");
    const res = await fetch(`http://127.0.0.1:${port}/layouts/analyze-plan`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        fileName: "plan.txt",
        mimeType: "text/plain",
        dataBase64: text,
      }),
    });
    const body = await res.json();
    assert.equal(res.status, 200, JSON.stringify(body));
    assert.equal(body.fixturePlan.importMode, "fixture");
    assert.ok(body.fixturePlan.runs.length >= 2);
  });
});
