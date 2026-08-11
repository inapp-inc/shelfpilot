import test from "node:test";
import assert from "node:assert/strict";
import {
  buildAisleGraph,
  computeShopperRoute,
  segmentCrossesShelves,
} from "../../web/src/shopper/shopperWayfinding.js";

test("route stays on aisle graph and does not cut through parallel shelf row", () => {
  const layout = {
    widthMeters: 30,
    depthMeters: 20,
    aisles: [
      { id: "a1", orientation: "vertical", x: 4, y: 2, widthMeters: 1.2, lengthMeters: 16 },
      { id: "a2", orientation: "vertical", x: 14, y: 2, widthMeters: 1.2, lengthMeters: 16 },
      { id: "a3", orientation: "horizontal", x: 2, y: 10, widthMeters: 1.2, lengthMeters: 24 },
    ],
    shelves: [
      {
        id: "s1",
        x: 5,
        y: 4,
        widthMeters: 1.2,
        depthMeters: 0.6,
        rotationDeg: 0,
        aisleId: "a1",
      },
      {
        id: "s-block",
        x: 8,
        y: 4,
        widthMeters: 4,
        depthMeters: 0.6,
        rotationDeg: 0,
        aisleId: "a2",
      },
    ],
    entryPoints: [{ id: "e1", x: 4, y: 1, label: "Entrance" }],
  };

  const route = computeShopperRoute(layout, layout.entryPoints[0], "s-block");
  assert.ok(route.length >= 2);

  for (let i = 1; i < route.length; i += 1) {
    const a = route[i - 1];
    const b = route[i];
    assert.ok(
      !segmentCrossesShelves(layout, a, b, "s-block"),
      `segment ${i} should not cross shelves`
    );
  }

  const { edges } = buildAisleGraph(layout);
  assert.ok(edges.length >= 2, "aisle graph should connect corridors");
});

test("route uses cross-aisle between parallel runways", () => {
  const layout = {
    widthMeters: 30,
    depthMeters: 20,
    aisles: [
      { id: "a1", orientation: "vertical", x: 4, y: 2, widthMeters: 1.2, lengthMeters: 16 },
      { id: "a2", orientation: "vertical", x: 14, y: 2, widthMeters: 1.2, lengthMeters: 16 },
      { id: "cross", orientation: "horizontal", x: 2, y: 10, widthMeters: 1.2, lengthMeters: 24 },
    ],
    shelves: [
      { id: "s1", x: 5, y: 12, widthMeters: 1.2, depthMeters: 0.6, rotationDeg: 0, aisleId: "a2" },
    ],
    entryPoints: [{ id: "e1", x: 4.6, y: 1, label: "Entrance" }],
  };

  const route = computeShopperRoute(layout, layout.entryPoints[0], "s1");
  assert.ok(route.length >= 3);
  const usesCross = route.some((p) => Math.abs(p.y - 10.6) < 0.8);
  assert.ok(usesCross, "route should pass through cross-aisle");
});
