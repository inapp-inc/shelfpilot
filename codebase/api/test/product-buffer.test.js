import test from "node:test";
import assert from "node:assert/strict";
import {
  PRODUCT_LATERAL_BUFFER_BAY_RESERVE_M,
  PRODUCT_LATERAL_BUFFER_TOTAL_M,
  computeMaxDepthFacings,
  computeMaxFacings,
  productSlotWidthMeters,
} from "../../shared/productBuffer.mjs";

test("FR-BUF-01: product slot includes 1 cm lateral buffer", () => {
  assert.equal(PRODUCT_LATERAL_BUFFER_TOTAL_M, 0.01);
  assert.equal(productSlotWidthMeters(0.2), 0.21);
});

test("FR-BUF-01: max facings = floor((U - bayReserve) / (W + buffer))", () => {
  // U=1.2m, W=0.2m → floor((1.2 - 0.01) / 0.21) = 5
  assert.equal(computeMaxFacings(1.2, 0.2), 5);
  // U=1.0m, W=0.25m → floor(0.99 / 0.26) = 3
  assert.equal(computeMaxFacings(1.0, 0.25), 3);
  // Exact fit without buffer would be 6; buffer removes one facing
  assert.equal(computeMaxFacings(1.2, 0.2), Math.floor((1.2 - PRODUCT_LATERAL_BUFFER_BAY_RESERVE_M) / 0.21));
});

test("FR-BUF-01: max depth facings apply same buffer along shelf depth", () => {
  // depth 0.6, product 0.2 → floor(0.59 / 0.21) = 2 (was 3 without buffer)
  assert.equal(computeMaxDepthFacings(0.6, 0.2), 2);
  assert.equal(computeMaxDepthFacings(0.5, 0.25), 1);
});

test("FR-BUF-01: zero facings when bay too narrow for buffer + product", () => {
  assert.equal(computeMaxFacings(0.01, 0.2), 0);
  assert.equal(computeMaxFacings(0.2, 0.2), 0);
});
