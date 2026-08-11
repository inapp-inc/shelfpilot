import assert from "node:assert/strict";
import test from "node:test";
import { bindShelvesToAisles } from "../src/services/aisleBinding.js";
import { packAislesAndShelves } from "../src/services/layoutPacker.js";

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

test("autogenerate binds front and back shelves to walk aisles", () => {
  const { aisles, shelves } = packAislesAndShelves(RECT, {
    orientation: "horizontal",
    minAisleWidthMeters: 1.2,
    shelfTemplate: { type: "gondola", usableWidthMeters: 1.2, depthMeters: 0.6 },
  });
  assert.ok(aisles.length >= 2);
  const pairs = shelves.filter((s) => s.pairId && s.pairRole === "front");
  assert.ok(pairs.length >= 1);
  const front = pairs[0];
  const back = shelves.find((s) => s.pairId === front.pairId && s.pairRole === "back");
  assert.ok(back);
  assert.ok(front.aisleId, "front shelf should bind to facing walk aisle");
  assert.ok(back.aisleId, "back shelf should bind to rear walk aisle");
  assert.notEqual(front.aisleId, back.aisleId, "front and back should face different aisles");
});

test("bindShelvesToAisles assigns aisleId on single shelves", () => {
  const { aisles, shelves } = packAislesAndShelves(RECT, { orientation: "horizontal", minAisleWidthMeters: 1.2 });
  bindShelvesToAisles(shelves, aisles, RECT);
  assert.ok(shelves.some((s) => s.aisleId));
});

test("face-derived aisles bind most gondola fronts on a hypermarket floor", () => {
  const layout = {
    widthMeters: 23.1,
    depthMeters: 15,
    shape: "polygon",
    polygon: [
      { x: 0, y: 0 },
      { x: 23.1, y: 0 },
      { x: 23.1, y: 15 },
      { x: 0, y: 15 },
    ],
  };
  const { aisles, shelves } = packAislesAndShelves(layout, {
    orientation: "horizontal",
    minAisleWidthMeters: 1.5,
    compactMode: true,
    fillRemaining: true,
    shelfTemplate: { type: "gondola", usableWidthMeters: 1.8, depthMeters: 0.9, defaultLevels: 3 },
  });
  const fronts = shelves.filter((s) => s.pairRole !== "back");
  const bound = fronts.filter((s) => s.aisleId).length;
  assert.ok(aisles.length >= 2, "walk corridors should render");
  assert.ok(bound / fronts.length >= 0.95, `expected ≥95% fronts bound (${bound}/${fronts.length})`);
});
