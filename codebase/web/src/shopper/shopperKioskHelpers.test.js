import { describe, expect, it } from "vitest";
import {
  buildShelfMarkersForPlacements,
  nearestPlacementFromEntry,
  placementSpotLabel,
} from "./shopperKioskHelpers.js";

describe("placementSpotLabel", () => {
  it("combines aisle and bay", () => {
    expect(
      placementSpotLabel({ aisleLabel: "4", shelfLabel: "4A · Face A" }, 0)
    ).toBe("Aisle 4 · 4A");
  });

  it("falls back to spot index", () => {
    expect(placementSpotLabel({}, 2)).toBe("Spot 3");
  });
});

describe("nearestPlacementFromEntry", () => {
  it("picks placement with shorter route", () => {
    const layout = { shelves: [] };
    const placements = [
      { id: "a", shelfId: "shf-a" },
      { id: "b", shelfId: "shf-b" },
    ];
    const computeRoute = (_layout, _entry, shelfId) =>
      shelfId === "shf-a" ? [{ x: 0, y: 0 }, { x: 1, y: 0 }] : [{ x: 0, y: 0 }, { x: 5, y: 0 }];
    const { placement } = nearestPlacementFromEntry(layout, { x: 0, y: 0 }, placements, {
      computeRoute,
      routeLengthMeters: (path) => (path.length >= 2 ? Math.abs(path[1].x - path[0].x) : 0),
    });
    expect(placement.id).toBe("a");
  });
});

describe("buildShelfMarkersForPlacements", () => {
  it("returns one marker per placement with spot index", () => {
    const layout = {
      shelves: [
        { id: "shf-1", x: 1, y: 1, widthMeters: 1, depthMeters: 0.6, rotationDeg: 0 },
        { id: "shf-2", x: 5, y: 1, widthMeters: 1, depthMeters: 0.6, rotationDeg: 0 },
      ],
    };
    const markers = buildShelfMarkersForPlacements(
      layout,
      [
        { id: "p1", shelfId: "shf-1" },
        { id: "p2", shelfId: "shf-2" },
      ],
      { primaryShelfId: "shf-1", route: [] }
    );
    expect(markers).toHaveLength(2);
    expect(markers[0].spotIndex).toBe(1);
    expect(markers[0].isPrimary).toBe(true);
    expect(markers[1].isPrimary).toBe(false);
  });
});
