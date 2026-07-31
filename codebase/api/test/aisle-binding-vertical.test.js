import assert from "node:assert/strict";
import test from "node:test";
import { bindShelvesToAisles } from "../src/services/aisleBinding.js";
import { finalizeAisleLabeling, shelfDisplayLabelFromAisle } from "../src/services/aisleLabeling.js";

const LAYOUT = {
  widthMeters: 12,
  depthMeters: 10,
  entryPoints: [{ x: 0, y: 0 }],
  shape: "rect",
};

test("shelf facing vertical aisle binds to that aisle not crossing horizontal aisle", () => {
  const aisles = [
    {
      id: "v9",
      orientation: "vertical",
      x: 2.4,
      y: 0.5,
      widthMeters: 1.2,
      lengthMeters: 9,
      aisleNumber: 9,
    },
    {
      id: "hCross",
      orientation: "horizontal",
      x: 0.5,
      y: 4.8,
      widthMeters: 10,
      lengthMeters: 1.2,
      aisleNumber: 14,
    },
  ];
  const shelves = [
    {
      id: "s1",
      x: 3.7,
      y: 4.5,
      usableWidthMeters: 1.2,
      widthMeters: 1.2,
      depthMeters: 0.6,
      rotationDeg: 90,
    },
  ];
  bindShelvesToAisles(shelves, aisles, LAYOUT);
  assert.equal(shelves[0].aisleId, "v9");
  assert.notEqual(shelves[0].aisleId, "hCross");

  const labeled = finalizeAisleLabeling(shelves, aisles, LAYOUT);
  const label = shelfDisplayLabelFromAisle(labeled.shelves[0], labeled.aisles);
  const vNum = labeled.aisles.find((a) => a.id === "v9")?.aisleNumber;
  assert.equal(label, `${vNum}A`);
  assert.notEqual(label, "14D");
});

test("gondola between vertical aisles labels front/back with facing aisle numbers", () => {
  const aisles = [
    {
      id: "vLeft",
      orientation: "vertical",
      x: 2.4,
      y: 0.5,
      widthMeters: 1.2,
      lengthMeters: 9,
    },
    {
      id: "vRight",
      orientation: "vertical",
      x: 5.4,
      y: 0.5,
      widthMeters: 1.2,
      lengthMeters: 9,
    },
  ];
  const shelves = [
    {
      id: "front",
      pairId: "p1",
      pairRole: "front",
      x: 3.7,
      y: 3,
      usableWidthMeters: 1.2,
      widthMeters: 1.2,
      depthMeters: 0.6,
      rotationDeg: 90,
    },
    {
      id: "back",
      pairId: "p1",
      pairRole: "back",
      x: 4.3,
      y: 3,
      usableWidthMeters: 1.2,
      widthMeters: 1.2,
      depthMeters: 0.6,
      rotationDeg: 270,
    },
  ];
  bindShelvesToAisles(shelves, aisles, LAYOUT);
  assert.equal(shelves.find((s) => s.id === "front").aisleId, "vLeft");
  assert.equal(shelves.find((s) => s.id === "back").aisleId, "vRight");

  const labeled = finalizeAisleLabeling(shelves, aisles, LAYOUT);
  const leftNum = labeled.aisles.find((a) => a.id === "vLeft")?.aisleNumber;
  const rightNum = labeled.aisles.find((a) => a.id === "vRight")?.aisleNumber;
  assert.notEqual(leftNum, rightNum);
});
