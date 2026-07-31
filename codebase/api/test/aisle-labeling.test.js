import assert from "node:assert/strict";
import test from "node:test";
import { packAislesAndShelves } from "../src/services/layoutPacker.js";
import {
  aisleShelfLabel,
  assignAisleNumbers,
  finalizeAisleLabeling,
  labelIndexToSuffix,
  shelfDisplayLabelFromAisle,
  shelfLetter,
} from "../src/services/aisleLabeling.js";
import { finalizeAisleShelfBinding } from "../src/services/aisleBinding.js";

test("shelfLetter maps index to A, B, C", () => {
  assert.equal(shelfLetter(0), "A");
  assert.equal(shelfLetter(1), "B");
  assert.equal(shelfLetter(2), "C");
});

test("labelIndexToSuffix maps index to AA, AB, AC", () => {
  assert.equal(labelIndexToSuffix(0), "AA");
  assert.equal(labelIndexToSuffix(1), "AB");
  assert.equal(labelIndexToSuffix(2), "AC");
  assert.equal(labelIndexToSuffix(26), "BA");
});

test("aisleShelfLabel formats aisle-centric labels", () => {
  assert.equal(aisleShelfLabel(4, 0), "4A");
  assert.equal(aisleShelfLabel(4, 1), "4B");
  assert.equal(aisleShelfLabel(9, 2), "9C");
  assert.equal(aisleShelfLabel(12, 2), "12C");
});

test("assignAisleNumbers assigns sequential numbers", () => {
  const layout = {
    widthMeters: 20,
    depthMeters: 15,
    entryPoints: [{ x: 0, y: 0 }],
    shape: "rect",
  };
  const aisles = [
    { id: "a2", orientation: "horizontal", x: 0, y: 5, widthMeters: 1.2, lengthMeters: 10 },
    { id: "a1", orientation: "horizontal", x: 0, y: 2, widthMeters: 1.2, lengthMeters: 10 },
  ];
  const numbered = assignAisleNumbers(aisles, layout);
  const byId = Object.fromEntries(numbered.map((a) => [a.id, a.aisleNumber]));
  assert.equal(byId.a1, 1);
  assert.equal(byId.a2, 2);
});

test("packAislesAndShelves assigns aisle numbers and shelf indices", () => {
  const layout = {
    id: "L1",
    widthMeters: 16,
    depthMeters: 12,
    shape: "polygon",
    polygon: [
      { x: 0, y: 0 },
      { x: 16, y: 0 },
      { x: 16, y: 12 },
      { x: 0, y: 12 },
    ],
    entryPoints: [{ x: 0, y: 0 }],
    aisles: [],
    shelves: [],
  };
  const packed = packAislesAndShelves(layout, {
    orientation: "horizontal",
    minAisleWidthMeters: 1.2,
    compactMode: true,
  });
  assert.ok(packed.aisles.length >= 2);
  assert.ok(packed.shelves.length >= 2);
  for (const a of packed.aisles) {
    assert.ok(a.aisleNumber >= 1, "each aisle has aisleNumber");
  }
  const withLabels = packed.shelves.filter((s) => s.shelfIndexAlongAisle != null);
  assert.ok(withLabels.length > 0, "shelves have shelfIndexAlongAisle");
});

test("shelfDisplayLabelFromAisle resolves label from binding", () => {
  const aisles = [{ id: "a4", aisleNumber: 4 }];
  const shelf = { id: "s1", aisleId: "a4", shelfIndexAlongAisle: 1 };
  assert.equal(shelfDisplayLabelFromAisle(shelf, aisles), "4B");
});

test("finalizeAisleLabeling runs after binding", () => {
  const layout = {
    widthMeters: 10,
    depthMeters: 8,
    entryPoints: [{ x: 0, y: 0 }],
  };
  let shelves = [
    {
      id: "f1",
      pairId: "p1",
      pairRole: "front",
      x: 2,
      y: 2,
      usableWidthMeters: 1.2,
      widthMeters: 1.2,
      depthMeters: 0.6,
      rotationDeg: 0,
    },
    {
      id: "b1",
      pairId: "p1",
      pairRole: "back",
      x: 2,
      y: 2.6,
      usableWidthMeters: 1.2,
      widthMeters: 1.2,
      depthMeters: 0.6,
      rotationDeg: 180,
    },
  ];
  const aisles = [
    { id: "walk1", orientation: "horizontal", x: 1, y: 1, widthMeters: 1.2, lengthMeters: 4 },
    { id: "walk2", orientation: "horizontal", x: 1, y: 3.5, widthMeters: 1.2, lengthMeters: 4 },
  ];
  ({ shelves } = finalizeAisleShelfBinding(shelves, aisles, layout));
  const labeled = finalizeAisleLabeling(shelves, aisles, layout);
  assert.ok(labeled.aisles.some((a) => a.aisleNumber != null));
  const front = labeled.shelves.find((s) => s.id === "f1");
  const back = labeled.shelves.find((s) => s.id === "b1");
  assert.notEqual(front.aisleId, back.aisleId);
  const frontLbl = shelfDisplayLabelFromAisle(front, labeled.aisles);
  const backLbl = shelfDisplayLabelFromAisle(back, labeled.aisles);
  assert.notEqual(frontLbl, backLbl);
});

test("gondola back is labelled on rear aisle not front aisle", () => {
  const layout = {
    widthMeters: 10,
    depthMeters: 8,
    entryPoints: [{ x: 0, y: 0 }],
  };
  const aisles = [
    { id: "walk1", orientation: "horizontal", x: 1, y: 1, widthMeters: 1.2, lengthMeters: 4 },
    { id: "walk2", orientation: "horizontal", x: 1, y: 3.5, widthMeters: 1.2, lengthMeters: 4 },
  ];
  const shelves = [
    {
      id: "f1",
      pairId: "p1",
      pairRole: "front",
      aisleId: "walk1",
      x: 2,
      y: 2,
      usableWidthMeters: 1.2,
      widthMeters: 1.2,
      depthMeters: 0.6,
      rotationDeg: 0,
    },
    {
      id: "b1",
      pairId: "p1",
      pairRole: "back",
      aisleId: "walk2",
      x: 2,
      y: 2.6,
      usableWidthMeters: 1.2,
      widthMeters: 1.2,
      depthMeters: 0.6,
      rotationDeg: 180,
    },
  ];
  const labeled = finalizeAisleLabeling(shelves, aisles, layout);
  const front = labeled.shelves.find((s) => s.id === "f1");
  const back = labeled.shelves.find((s) => s.id === "b1");
  const frontAisle = labeled.aisles.find((a) => a.id === front.aisleId);
  const backAisle = labeled.aisles.find((a) => a.id === back.aisleId);
  assert.notEqual(frontAisle?.aisleNumber, backAisle?.aisleNumber);
  assert.equal(shelfDisplayLabelFromAisle(front, labeled.aisles), `${frontAisle.aisleNumber}A`);
  assert.equal(shelfDisplayLabelFromAisle(back, labeled.aisles), `${backAisle.aisleNumber}A`);
});
