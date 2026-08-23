import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_NAMING_CONVENTION,
  formatAisle,
  formatBay,
  formatShelfCode,
  parseShelfCode,
  resolveNamingConvention,
} from "../../shared/labelFormat.mjs";

test("default naming reproduces 4A / 4B shelf codes", () => {
  assert.equal(formatShelfCode(4, 0), "4A");
  assert.equal(formatShelfCode(4, 1), "4B");
  assert.equal(formatAisle(4), "4");
  assert.equal(formatBay(4, 2), "4C");
});

test("parseShelfCode round-trips default labels", () => {
  const parsed = parseShelfCode("10D");
  assert.deepEqual(parsed, { aisleNumber: 10, bayIndex: 3 });
  assert.equal(formatShelfCode(parsed.aisleNumber, parsed.bayIndex), "10D");
});

test("resolveNamingConvention prefers layout override", () => {
  const layout = {
    namingConvention: {
      ...DEFAULT_NAMING_CONVENTION,
      bayPattern: "{n}-{bay}",
    },
  };
  const conv = resolveNamingConvention(layout, null);
  assert.equal(formatShelfCode(4, 0, conv), "4-A");
});
