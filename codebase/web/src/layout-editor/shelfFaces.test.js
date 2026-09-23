import { describe, expect, it } from "vitest";
import { shelvesForScene3D } from "./shelfFaces.js";

function shelf(overrides) {
  return {
    id: "shf-1",
    type: "shelf",
    widthMeters: 1.8,
    usableWidthMeters: 1.8,
    depthMeters: 0.9,
    heightMeters: 2,
    x: 0,
    y: 0,
    rotationDeg: 0,
    faces: [{ id: "A", planogram: [] }],
    ...overrides,
  };
}

/** Mirrors the API's oppositeShelfOrigin(): the back half of a pair sits on the SAME floor
 *  footprint, anchored at the diagonally opposite corner with rotation + 180. */
function backHalfOf(front) {
  const rad = ((front.rotationDeg || 0) * Math.PI) / 180;
  const w = front.usableWidthMeters ?? front.widthMeters;
  const d = front.depthMeters;
  return shelf({
    id: `${front.id}-back`,
    pairId: front.pairId,
    pairRole: "back",
    x: front.x + w * Math.cos(rad) - d * Math.sin(rad),
    y: front.y + w * Math.sin(rad) + d * Math.cos(rad),
    rotationDeg: ((front.rotationDeg || 0) + 180) % 360,
    widthMeters: front.widthMeters,
    usableWidthMeters: front.usableWidthMeters,
    depthMeters: front.depthMeters,
  });
}

describe("shelvesForScene3D", () => {
  // Regression guard for a real mistake: front/back of a pair share ONE footprint, but the
  // back is anchored at the diagonally opposite corner — so their anchor coordinates are a
  // footprint-diagonal apart (2.01m for a 1.8x0.9 gondola). Treating that anchor distance as
  // a physical gap and refusing to merge draws two interpenetrating boxes on one footprint,
  // which reads on screen as one fused "warehouse rack" blob instead of a clean gondola.
  it("merges a shared-footprint pair even though its anchors are a full diagonal apart", () => {
    const front = shelf({ id: "front-1", pairId: "pair-1", pairRole: "front", x: 0.2, y: 1.75 });
    const back = backHalfOf(front);

    // Sanity: this is exactly the geometry the packer produces, and the anchors are far apart.
    expect(back.x).toBeCloseTo(2.0, 3);
    expect(back.y).toBeCloseTo(2.65, 3);
    expect(back.rotationDeg).toBe(180);
    expect(Math.hypot(front.x - back.x, front.y - back.y)).toBeCloseTo(2.012, 2);

    const out = shelvesForScene3D([front, back]);
    expect(out).toHaveLength(1);
    expect(out[0].pairDisplay).toBe(true);
    expect(out[0].pairShelfIds).toEqual({ front: "front-1", back: "front-1-back" });
  });

  it("merges a small-footprint pair too (shorter diagonal, same rule)", () => {
    const front = shelf({
      id: "front-2",
      pairId: "pair-2",
      pairRole: "front",
      x: 1,
      y: 1,
      widthMeters: 1.2,
      usableWidthMeters: 1.2,
      depthMeters: 0.6,
    });
    const back = backHalfOf(front);
    const out = shelvesForScene3D([front, back]);
    expect(out).toHaveLength(1);
    expect(out[0].pairDisplay).toBe(true);
  });

  it("renders an unpaired shelf as its own single-sided unit", () => {
    const solo = shelf({ id: "solo-1" });
    const out = shelvesForScene3D([solo]);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe("solo-1");
    expect(out[0].pairDisplay).toBeFalsy();
  });

  it("renders a pair whose back half is missing as a single unit (no crash)", () => {
    const orphan = shelf({ id: "orphan-1", pairId: "pair-3", pairRole: "front" });
    const out = shelvesForScene3D([orphan]);
    expect(out).toHaveLength(1);
    expect(out[0].id).toBe("orphan-1");
  });
});
