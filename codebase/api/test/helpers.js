import assert from "node:assert/strict";

/** Accept shelf arrangement so planogram mutation routes are unlocked. */
export async function acceptArrangement(port, headers, layoutId, body = { fillPlanogram: false }) {
  const res = await fetch(`http://127.0.0.1:${port}/layouts/${layoutId}/arrangement/accept`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (res.status !== 200) {
    assert.fail(`arrangement accept expected 200, got ${res.status}: ${await res.text()}`);
  }
  return res.json();
}
