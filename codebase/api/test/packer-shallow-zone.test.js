import assert from "node:assert/strict";
import test from "node:test";
import { packAislesAndShelves } from "../src/services/layoutPacker.js";

const SHALLOW = {
  widthMeters: 10,
  depthMeters: 4,
  shape: "polygon",
  polygon: [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 4 },
    { x: 0, y: 4 },
  ],
};

test("shallow zone uses full runway with aisles when depth allows", () => {
  const { aisles, shelves } = packAislesAndShelves(SHALLOW, {
    orientation: "horizontal",
    minAisleWidthMeters: 1.2,
    shelfTemplate: { type: "gondola", usableWidthMeters: 1.2, depthMeters: 0.6 },
  });

  assert.ok(shelves.length >= 2, "expected at least one front+back gondola pair");
  assert.ok(aisles.length >= 2, "gondola row should have walk aisles on both sides");
  assert.ok(shelves.every((s) => s.pairId), "each shelf belongs to a front/back pair");
});

test("vertical orientation emits walk aisles beside every column", () => {
  const tall = {
    widthMeters: 8,
    depthMeters: 12,
    shape: "polygon",
    polygon: [
      { x: 0, y: 0 },
      { x: 8, y: 0 },
      { x: 8, y: 12 },
      { x: 0, y: 12 },
    ],
  };
  const { aisles, shelves } = packAislesAndShelves(tall, {
    orientation: "vertical",
    minAisleWidthMeters: 1.2,
    compactMode: true,
    shelfTemplate: { type: "gondola", usableWidthMeters: 1.2, depthMeters: 0.6 },
  });
  const verticalAisles = aisles.filter((a) => a.orientation === "vertical");
  assert.ok(shelves.length >= 2, "expected vertical gondola pairs");
  assert.ok(verticalAisles.length >= 2, "vertical columns should have walk aisles");
  const fronts = shelves.filter((s) => s.pairRole === "front" && ((s.rotationDeg || 0) + 360) % 360 === 90);
  assert.ok(fronts.length >= 1);
  const boundFronts = fronts.filter((s) => s.aisleId);
  assert.ok(boundFronts.length >= Math.ceil(fronts.length * 0.6), "most vertical fronts bind to walk aisles");
});

test("compact mode emits walk aisles between gondola bands", () => {
  const { aisles, shelves } = packAislesAndShelves(SHALLOW, {
    orientation: "horizontal",
    minAisleWidthMeters: 1.2,
    compactMode: true,
    shelfTemplate: { type: "gondola", usableWidthMeters: 1.2, depthMeters: 0.6 },
  });
  assert.ok(shelves.length >= 2, "expected gondola pairs on shallow floor");
  assert.ok(aisles.length >= 2, "compact strip emits walk aisles between bands");
});
