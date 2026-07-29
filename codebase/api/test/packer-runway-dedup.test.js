import assert from "node:assert/strict";
import test from "node:test";
import { packAislesAndShelves } from "../src/services/layoutPacker.js";
import { aisleFootprint } from "../src/services/polygonContainment.js";

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

function horizontalAisleYs(aisles) {
  return aisles.filter((a) => a.orientation === "horizontal").map((a) => Number(a.y.toFixed(2)));
}

function aisleOverlapArea(a, b, layout) {
  const fa = aisleFootprint(a, layout);
  const fb = aisleFootprint(b, layout);
  const ox = Math.max(0, Math.min(fa.x + fa.w, fb.x + fb.w) - Math.max(fa.x, fb.x));
  const oy = Math.max(0, Math.min(fa.y + fa.d, fb.y + fb.d) - Math.max(fa.y, fb.y));
  return ox * oy;
}

test("stacked runway bands merge shared boundary into one aisle entity", () => {
  const { aisles, shelves, gondolaUnits } = packAislesAndShelves(RECT, {
    orientation: "horizontal",
    minAisleWidthMeters: 1.2,
    shelfTemplate: { type: "gondola", usableWidthMeters: 1.2, depthMeters: 0.6 },
  });
  assert.ok(gondolaUnits >= 2, "expected multiple gondola units");
  assert.ok(shelves.length >= 4, "expected front+back shelf pairs");

  const ys = horizontalAisleYs(aisles);
  const uniqueYs = [...new Set(ys)];
  assert.equal(ys.length, uniqueYs.length, "duplicate horizontal aisles at same y should merge");

  for (let i = 0; i < aisles.length; i += 1) {
    for (let j = i + 1; j < aisles.length; j += 1) {
      const overlap = aisleOverlapArea(aisles[i], aisles[j], RECT);
      assert.ok(overlap < 0.01, "aisles should not overlap unless merged");
    }
  }
});

test("mixed orientation uses perimeter runways without cross-aisle grid", () => {
  const horizontal = packAislesAndShelves(RECT, {
    orientation: "horizontal",
    minAisleWidthMeters: 1.2,
  });
  const mixed = packAislesAndShelves(RECT, {
    orientation: "mixed",
    minAisleWidthMeters: 1.2,
  });
  assert.ok(mixed.shelfCount >= horizontal.shelfCount * 0.75, "mixed should fill floor comparably");
  assert.ok(
    mixed.aisleCount <= horizontal.aisleCount + 6,
    "mixed perimeter should not add a full cross-aisle grid"
  );
  const orients = new Set(mixed.aisles.map((a) => a.orientation));
  assert.ok(orients.has("horizontal") || orients.has("vertical"));
});

test("packer returns gondolaUnits and walkAisles counts", () => {
  const packed = packAislesAndShelves(RECT, { minAisleWidthMeters: 1.2 });
  assert.ok(typeof packed.gondolaUnits === "number");
  assert.ok(typeof packed.walkAisles === "number");
  assert.equal(packed.walkAisles, packed.aisleCount);
  assert.ok(packed.gondolaUnits <= packed.shelfCount);
});
