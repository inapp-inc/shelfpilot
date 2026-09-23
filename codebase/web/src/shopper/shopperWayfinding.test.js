import { describe, expect, it } from "vitest";
import {
  buildAisleGraph,
  computeShopperRoute,
  ensureRouteEndsAtShelf,
  nearestCenterlinePoint,
  routePolylineForMap,
  shelfCenter,
  shelfRouteDestination,
} from "./shopperWayfinding.js";

describe("ensureRouteEndsAtShelf", () => {
  const layout = {
    aisles: [
      {
        id: "aisle-1",
        orientation: "horizontal",
        x: 0,
        y: 4,
        widthMeters: 10,
        lengthMeters: 10,
      },
    ],
    shelves: [
      {
        id: "shf-target",
        x: 6,
        y: 2,
        usableWidthMeters: 2,
        widthMeters: 2,
        depthMeters: 0.8,
        rotationDeg: 0,
        aisleId: "aisle-1",
      },
    ],
  };

  it("extends a short aisle path to the shelf approach point", () => {
    const aisleEnd = { x: 5, y: 4 };
    const route = [
      { x: 1, y: 4 },
      aisleEnd,
    ];
    const walked = routePolylineForMap(layout, route, "shf-target");
    expect(walked.length).toBeGreaterThanOrEqual(2);
    const shelf = layout.shelves[0];
    const { lines } = buildAisleGraph(layout);
    const aisleNear = nearestCenterlinePoint(lines, shelfCenter(shelf)).point;
    const dest = shelfRouteDestination(shelf, layout, aisleNear);
    expect(walked[walked.length - 1]).toEqual(dest);
  });

  it("walks assigned aisle and cross-aisle, not the nearest runway only", () => {
    const crossLayout = {
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
    const route = computeShopperRoute(crossLayout, crossLayout.entryPoints[0], "s1");
    expect(route.some((p) => Math.abs(p.y - 10.6) < 0.8)).toBe(true);
    expect(route.some((p) => Math.abs(p.x - 14.6) < 0.5)).toBe(true);
  });

  it("returns at least two points for map rendering", () => {
    const out = ensureRouteEndsAtShelf(
      layout,
      [
        { x: 0, y: 4 },
        { x: 5, y: 4 },
      ],
      "shf-target"
    );
    expect(out.length).toBeGreaterThanOrEqual(2);
  });
});
