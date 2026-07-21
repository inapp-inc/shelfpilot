import test from "node:test";
import assert from "node:assert/strict";
import app from "../src/index.js";

test("GET /health returns ok", async () => {
  const server = app.listen(0);
  const { port } = server.address();
  const res = await fetch(`http://127.0.0.1:${port}/health`);
  const body = await res.json();
  server.close();
  assert.equal(res.status, 200);
  assert.equal(body.ok, true);
  assert.ok(body.correlationId);
});
