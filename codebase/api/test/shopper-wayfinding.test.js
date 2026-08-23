import test from "node:test";
import assert from "node:assert/strict";
import { shelfRotatedCorners } from "../../web/src/layout-editor/polygonCanvas.js";
import {
  assumeEntranceSpace,
  bindRouteToAisles,
  buildAisleGraph,
  computeShopperRoute,
  resolveShopperEntry,
  routePolylineForMap,
  segmentCrossesShelves,
  shelfMarkerFootprint,
  shelfMarkerPoint,
  walkAisleNetwork,
} from "../../web/src/shopper/shopperWayfinding.js";

function pointInPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i].x;
    const yi = poly[i].y;
    const xj = poly[j].x;
    const yj = poly[j].y;
    const hit = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-12) + xi;
    if (hit) inside = !inside;
  }
  return inside;
}

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

test("assumes a front-of-store entrance space when none is configured", () => {
  const layout = {
    widthMeters: 30,
    depthMeters: 20,
    aisles: [
      { id: "a1", orientation: "vertical", x: 4, y: 2, widthMeters: 1.2, lengthMeters: 16 },
    ],
    shelves: [
      { id: "s1", x: 5.4, y: 6, widthMeters: 1.2, depthMeters: 0.6, rotationDeg: 0, aisleId: "a1" },
    ],
    entryPoints: [],
  };

  const entry = resolveShopperEntry(layout, null);
  assert.equal(entry.assumed, true);
  assert.equal(entry.label, "Entrance");
  assert.ok(entry.plaza);
  assert.ok(entry.y <= 3, "entrance sits at the front of an aisle");
  assert.ok(Math.abs(entry.x - 4.6) < 0.3, "entrance snaps onto the nearest aisle, not through fixtures");

  const plaza = assumeEntranceSpace(layout);
  assert.ok(plaza.plaza.w >= 1.4);
  assert.ok(plaza.plaza.d >= 1.1);

  const route = computeShopperRoute(layout, null, "s1");
  assert.ok(route.length >= 2, "walk line is drawn without a configured door");
  for (let i = 1; i < route.length - 1; i += 1) {
    assert.ok(
      !segmentCrossesShelves(layout, route[i - 1], route[i], "s1"),
      `assumed-entry segment ${i} should stay in aisles`
    );
  }
  const fp = shelfMarkerFootprint(layout, "s1", route[route.length - 2]);
  const end = route[route.length - 1];
  assert.ok(pointInPoly(end.x, end.y, fp.corners), "final segment should land on the shelf");
});

test("walk line stays on aisle centerlines (axis-aligned, no shelf shortcut)", () => {
  const layout = {
    widthMeters: 30,
    depthMeters: 20,
    aisles: [
      { id: "a1", orientation: "vertical", x: 4, y: 2, widthMeters: 1.2, lengthMeters: 16 },
      { id: "a2", orientation: "vertical", x: 14, y: 2, widthMeters: 1.2, lengthMeters: 16 },
      { id: "cross", orientation: "horizontal", x: 2, y: 10, widthMeters: 1.2, lengthMeters: 24 },
    ],
    shelves: [
      { id: "s1", x: 15.4, y: 6, widthMeters: 1.2, depthMeters: 0.6, rotationDeg: 90, aisleId: "a2" },
    ],
    entryPoints: [{ id: "e1", x: 4.6, y: 2, label: "Entrance" }],
  };

  const { lines } = buildAisleGraph(layout);
  const route = computeShopperRoute(layout, layout.entryPoints[0], "s1");
  assert.ok(route.length >= 3);

  for (let i = 1; i < route.length; i += 1) {
    const a = route[i - 1];
    const b = route[i];
    assert.ok(
      Math.abs(a.x - b.x) < 0.08 || Math.abs(a.y - b.y) < 0.08,
      `segment ${i} must be axis-aligned on a centerline`
    );
    assert.ok(!segmentCrossesShelves(layout, a, b, "s1"), `segment ${i} must not cut a shelf`);
  }

  const bound = bindRouteToAisles(
    [
      { x: 3, y: 1 },
      { x: 16, y: 14 },
    ],
    lines
  );
  const viaCross = bound.some((p) => Math.abs(p.y - 10.6) < 0.8);
  assert.ok(viaCross, "binding a diagonal still walks the cross aisle");
  assert.ok(walkAisleNetwork({ x: 4.6, y: 3 }, { x: 14.6, y: 8 }, lines).length >= 3);
});

test("parallel aisles walk the front corridor instead of cutting through gondolas", () => {
  const layout = {
    widthMeters: 24,
    depthMeters: 18,
    aisles: [
      { id: "a1", orientation: "vertical", x: 4, y: 3, widthMeters: 1.2, lengthMeters: 12 },
      { id: "a2", orientation: "vertical", x: 11, y: 3, widthMeters: 1.2, lengthMeters: 12 },
    ],
    shelves: [
      {
        id: "gondola",
        x: 6.2,
        y: 6,
        widthMeters: 3.6,
        depthMeters: 0.8,
        rotationDeg: 0,
        aisleId: "a1",
      },
      {
        id: "target",
        x: 12.4,
        y: 9,
        widthMeters: 1.2,
        depthMeters: 0.6,
        rotationDeg: 0,
        aisleId: "a2",
      },
    ],
    entryPoints: [{ id: "e1", x: 4.6, y: 3, label: "Entrance" }],
  };

  const route = computeShopperRoute(layout, layout.entryPoints[0], "target");
  assert.ok(route.length >= 3, "route must leave the entrance aisle to reach the other aisle");

  for (let i = 1; i < route.length; i += 1) {
    const a = route[i - 1];
    const b = route[i];
    assert.ok(
      Math.abs(a.x - b.x) < 0.1 || Math.abs(a.y - b.y) < 0.1,
      `segment ${i} must stay axis-aligned like a store map`
    );
    assert.ok(
      !segmentCrossesShelves(layout, a, b, "target"),
      `segment ${i} must not cut through a gondola`
    );
  }

  const reachedA2 = route.some((p) => Math.abs(p.x - 11.6) < 0.4);
  assert.ok(reachedA2, "path should walk into the target aisle, not stop at the store corner");

  const pin = shelfMarkerPoint(layout, "target", route[route.length - 1]);
  assert.ok(pin, "marker is placed");
  assert.ok(
    Math.hypot(pin.x - 13, pin.y - 9.3) < 2,
    "marker sits on the target shelf, not the store corner"
  );
  const fp = shelfMarkerFootprint(layout, "target", route.length >= 2 ? route[route.length - 2] : route[0]);
  const end = route[route.length - 1];
  assert.ok(pointInPoly(end.x, end.y, fp.corners), "navigation arrow ends on the target shelf");
});

test("far aisle 10D still draws a walk line when aisles overlap and disconnect", () => {
  const aisles = [];
  const shelves = [];
  for (let i = 0; i < 10; i += 1) {
    const x = 2 + i * 2.6;
    aisles.push({
      id: `a${i + 1}`,
      orientation: "vertical",
      x,
      y: 3,
      widthMeters: 1.2,
      lengthMeters: 12,
      aisleNumber: i + 1,
    });
    if (i < 9) {
      shelves.push({
        id: `block-${i}`,
        x: x + 1.35,
        y: 3.3,
        widthMeters: 1.05,
        depthMeters: 11.2,
        rotationDeg: 0,
        aisleId: `a${i + 1}`,
      });
    }
  }
  aisles.push({
    id: "overlap-on-10",
    orientation: "horizontal",
    x: 24.5,
    y: 8.4,
    widthMeters: 1.2,
    lengthMeters: 4.5,
  });
  shelves.push({
    id: "bay-10d",
    x: 2 + 9 * 2.6 + 1.35,
    y: 9.2,
    widthMeters: 1.2,
    depthMeters: 0.6,
    rotationDeg: 0,
    aisleId: "a10",
    shelfIndexAlongAisle: 3,
  });

  const layout = {
    widthMeters: 30,
    depthMeters: 18,
    aisles,
    shelves,
    entryPoints: [{ id: "e1", x: 2.6, y: 1.1, label: "Entrance" }],
  };

  const route = computeShopperRoute(layout, layout.entryPoints[0], "bay-10d");
  assert.ok(route.length >= 2, "walk line must be drawn to aisle 10 bay D");

  for (let i = 1; i < route.length; i += 1) {
    const a = route[i - 1];
    const b = route[i];
    assert.ok(
      Math.abs(a.x - b.x) < 0.12 || Math.abs(a.y - b.y) < 0.12,
      `segment ${i} must stay axis-aligned`
    );
    assert.ok(
      !segmentCrossesShelves(layout, a, b, "bay-10d"),
      `segment ${i} must not cut through a gondola`
    );
  }

  const last = route[route.length - 1];
  assert.ok(
    Math.abs(last.x - 26.1) < 3 || Math.abs(last.x - (2 + 9 * 2.6 + 0.6)) < 3,
    "path should finish at aisle 10, not the store corner"
  );
  const pin = shelfMarkerPoint(layout, "bay-10d", route.length >= 2 ? route[route.length - 2] : last);
  assert.ok(pin);
  const fp = shelfMarkerFootprint(layout, "bay-10d", route.length >= 2 ? route[route.length - 2] : last);
  assert.ok(pointInPoly(last.x, last.y, fp.corners), "route arrow must end on the target shelf");
  assert.ok(Math.hypot(pin.x - 26.8, pin.y - 9.5) < 3, "pin sits on 10D, not a corner");
});

test("map route line never extends through fixtures to the pin", () => {
  const layout = {
    widthMeters: 24,
    depthMeters: 18,
    aisles: [
      { id: "a1", orientation: "vertical", x: 4, y: 3, widthMeters: 1.2, lengthMeters: 12 },
      { id: "a2", orientation: "vertical", x: 11, y: 3, widthMeters: 1.2, lengthMeters: 12 },
    ],
    shelves: [
      {
        id: "gondola",
        x: 6.2,
        y: 6,
        widthMeters: 3.6,
        depthMeters: 0.8,
        rotationDeg: 0,
        aisleId: "a1",
      },
      {
        id: "target",
        x: 12.4,
        y: 9,
        widthMeters: 1.2,
        depthMeters: 0.6,
        rotationDeg: 0,
        aisleId: "a2",
      },
    ],
    entryPoints: [{ id: "e1", x: 4.6, y: 3, label: "Entrance" }],
  };

  const route = computeShopperRoute(layout, layout.entryPoints[0], "target");
  const drawn = routePolylineForMap(layout, route, "target");
  assert.ok(drawn.length >= 2);
  for (let i = 1; i < drawn.length; i += 1) {
    assert.ok(
      !segmentCrossesShelves(layout, drawn[i - 1], drawn[i], "target"),
      `drawn segment ${i} must stay in aisles`
    );
  }
});

test("product marker sits on the exact shelf, not outside the store", () => {
  const shelf = {
    id: "edge-bay",
    x: 1.2,
    y: 0.4,
    widthMeters: 1.2,
    depthMeters: 0.6,
    rotationDeg: 90,
    aisleId: "a1",
  };
  const layout = {
    widthMeters: 20,
    depthMeters: 16,
    aisles: [{ id: "a1", orientation: "vertical", x: 0.4, y: 0.4, widthMeters: 1.2, lengthMeters: 12 }],
    shelves: [shelf],
    entryPoints: [{ id: "e1", x: 1, y: 0.6, label: "Entrance" }],
  };

  const pin = shelfMarkerPoint(layout, "edge-bay");
  assert.ok(pin);
  const fp = shelfMarkerFootprint(layout, "edge-bay");
  assert.ok(fp?.corners?.length === 4);
  assert.ok(pointInPoly(pin.x, pin.y, fp.corners), "marker must sit on the shelf footprint");
  assert.ok(pin.x >= 0 && pin.x <= 20 && pin.y >= 0 && pin.y <= 16, "marker stays inside the store");
});

