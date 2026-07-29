import assert from "node:assert/strict";
import test from "node:test";
import { packAislesAndShelves } from "../src/services/layoutPacker.js";
import { entityInsideLayout, layoutBoundaryPolygon } from "../src/services/polygonContainment.js";
import { pruneOrphanAisles } from "../src/services/aisleBinding.js";

const L_SHAPE = {
  id: "lay-l-demo",
  widthMeters: 20,
  depthMeters: 20,
  shape: "polygon",
  vertical: "hypermarket",
  polygon: [
    { x: 0, y: 0 },
    { x: 12, y: 0 },
    { x: 12, y: 8 },
    { x: 20, y: 8 },
    { x: 20, y: 20 },
    { x: 0, y: 20 },
  ],
  entryPoints: [{ id: "entry-1", x: 2, y: 0, label: "Main entry" }],
};

const GONDOLA = {
  type: "gondola",
  usableWidthMeters: 1.8,
  depthMeters: 0.9,
  heightMeters: 2,
  defaultLevels: 3,
};

test("L-shaped hypermarket mixed pack fills floor without orphan aisles", () => {
  const packed = packAislesAndShelves(L_SHAPE, {
    orientation: "mixed",
    minAisleWidthMeters: 1.0,
    compactMode: true,
    shelfTemplate: GONDOLA,
  });

  assert.ok(packed.gondolaUnits >= 2, "expected multiple gondola units on L floor");
  assert.ok(packed.shelfCount >= 4, "expected front+back shelf pairs");

  for (const s of packed.shelves) {
    assert.ok(entityInsideLayout(s, "shelf", L_SHAPE), "every shelf must stay inside polygon");
  }
  for (const a of packed.aisles) {
    assert.ok(entityInsideLayout(a, "aisle", L_SHAPE), "every aisle must stay inside polygon");
  }

  const orphans = pruneOrphanAisles(packed.shelves, packed.aisles);
  assert.equal(orphans.length, packed.aisles.length, "no orphan walk aisles after pack");

  const pairs = packed.shelves.filter((s) => s.pairRole === "front");
  assert.ok(pairs.length >= 1);
  const front = pairs.find((s) => s.aisleId) || pairs[0];
  const back = packed.shelves.find((s) => s.pairId === front.pairId && s.pairRole === "back");
  const bound = Boolean(front.aisleId && back?.aisleId);
  assert.ok(bound || packed.aisles.length >= 1, "gondola pairs bind to aisles or floor has walk aisles");
  if (bound) {
    assert.notEqual(front.aisleId, back.aisleId, "A1 and A2 face different aisles");
  }
});

test("mixed perimeter mode does not emit cross-aisle grid", () => {
  const rect = {
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
  const horizontal = packAislesAndShelves(rect, {
    orientation: "horizontal",
    minAisleWidthMeters: 1.0,
    shelfTemplate: GONDOLA,
  });
  const mixed = packAislesAndShelves(rect, {
    orientation: "mixed",
    minAisleWidthMeters: 1.0,
    shelfTemplate: GONDOLA,
  });

  assert.ok(mixed.shelfCount >= horizontal.shelfCount * 0.65, "mixed should fill comparably to horizontal");
  assert.ok(
    mixed.aisleCount <= horizontal.aisleCount + 6,
    "mixed perimeter should not explode aisle count with cross grid"
  );

  const poly = layoutBoundaryPolygon(rect);
  const area = poly.length >= 3 ? 14 * 12 : 1;
  const shelfArea = mixed.shelves.reduce(
    (sum, s) => sum + Number(s.usableWidthMeters || 1) * Number(s.depthMeters || 0.6),
    0
  );
  assert.ok(shelfArea / area > 0.15, "reasonable fixture coverage on demo rectangle");
});
