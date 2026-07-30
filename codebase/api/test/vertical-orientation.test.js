import assert from "node:assert/strict";
import test from "node:test";
import { packAislesAndShelves } from "../src/services/layoutPacker.js";

const RECT_12x8 = {
  widthMeters: 12,
  depthMeters: 8,
  shape: "polygon",
  polygon: [
    { x: 0, y: 0 },
    { x: 12, y: 0 },
    { x: 12, y: 8 },
    { x: 0, y: 8 },
  ],
};

test("vertical orientation places shelves at 90° or 270°", () => {
  const { shelves } = packAislesAndShelves(RECT_12x8, {
    orientation: "vertical",
    minAisleWidthMeters: 1.2,
    shelfTemplate: { type: "gondola", usableWidthMeters: 1.2, depthMeters: 0.6 },
  });

  assert.ok(shelves.length >= 2, "places at least one gondola pair");
  const rots = shelves.map((s) => (((Number(s.rotationDeg) || 0) % 360) + 360) % 360);
  const verticalRots = rots.filter((r) => r === 90 || r === 270);
  assert.ok(
    verticalRots.length >= rots.length * 0.9,
    `expected ≥90% vertical rotations, got ${verticalRots.length}/${rots.length}`
  );
});

test("horizontal orientation places shelves at 0° or 180°", () => {
  const { shelves } = packAislesAndShelves(RECT_12x8, {
    orientation: "horizontal",
    minAisleWidthMeters: 1.2,
    shelfTemplate: { type: "gondola", usableWidthMeters: 1.2, depthMeters: 0.6 },
  });

  assert.ok(shelves.length >= 2);
  const rots = shelves.map((s) => (((Number(s.rotationDeg) || 0) % 360) + 360) % 360);
  const horizontalRots = rots.filter((r) => r === 0 || r === 180);
  assert.ok(
    horizontalRots.length >= rots.length * 0.9,
    `expected ≥90% horizontal rotations, got ${horizontalRots.length}/${rots.length}`
  );
});
