import { describe, expect, it } from "vitest";
import { focusGroupFor } from "./shelfFocusGroup.js";

/**
 * Builds a vertical gondola run like the packer emits: pairs whose front half faces one way and
 * whose back half is anchored at the diagonally opposite corner with rotation + 180, every shelf
 * in the run bound to the same aisle, plus a second column of gondolas 2.5m to the side that is
 * bound to that *same* aisle record.
 */
function verticalRun({ count = 4, pitch = 1.85 } = {}) {
  const shelves = [];
  let index = 0;
  for (let i = 0; i < count; i += 1) {
    const y = 1.1 + i * pitch;
    shelves.push({
      id: `front-${i}`,
      pairId: `pair-${i}`,
      pairRole: "front",
      aisleId: "aisle-1",
      shelfIndexAlongAisle: index++,
      x: 2.65,
      y,
      rotationDeg: 90,
      widthMeters: 1.8,
      depthMeters: 0.9,
    });
    shelves.push({
      id: `back-${i}`,
      pairId: `pair-${i}`,
      pairRole: "back",
      aisleId: "aisle-1",
      shelfIndexAlongAisle: index++,
      x: 1.75,
      y: y + 1.8,
      rotationDeg: 270,
      widthMeters: 1.8,
      depthMeters: 0.9,
    });
    // Neighbouring column on the same aisle record — 2.5m to the side, NOT along this run.
    shelves.push({
      id: `other-col-${i}`,
      pairId: `pair-other-${i}`,
      pairRole: "front",
      aisleId: "aisle-1",
      shelfIndexAlongAisle: index++,
      x: 5.15,
      y,
      rotationDeg: 90,
      widthMeters: 1.8,
      depthMeters: 0.9,
    });
  }
  return { shelves, aisles: [{ id: "aisle-1", widthMeters: 1.5 }] };
}

describe("focusGroupFor", () => {
  // Regression guard: the window used to be sliced by shelfIndexAlongAisle, but one aisle binds
  // both halves of every gondola *and* more than one gondola column, so consecutive indices are
  // not neighbours. Indices 0/1/2 were the target, the target's own back half (which renders as
  // the SAME unit), and a gondola in the next column — a "three-shelf" group that drew two units,
  // one of them across the way instead of beside the shelf you clicked.
  it("picks three distinct gondolas along the run, not by aisle index order", () => {
    const layout = verticalRun();
    const { physicalShelfIds } = focusGroupFor(layout, "front-0");

    expect(physicalShelfIds).toEqual(["front-0", "front-1", "front-2"]);
  });

  it("never returns both halves of one gondola (they render as a single unit)", () => {
    const layout = verticalRun();
    const byId = new Map(layout.shelves.map((s) => [s.id, s]));
    for (const targetId of ["front-1", "back-1", "front-0", "back-3"]) {
      const { physicalShelfIds } = focusGroupFor(layout, targetId);
      const pairIds = physicalShelfIds.map((id) => byId.get(id).pairId);
      expect(new Set(pairIds).size).toBe(pairIds.length);
    }
  });

  it("excludes the column that merely shares the aisle record", () => {
    const layout = verticalRun();
    const { physicalShelfIds } = focusGroupFor(layout, "front-1");
    expect(physicalShelfIds.some((id) => id.startsWith("other-col"))).toBe(false);
  });

  it("centres the window on a mid-run target", () => {
    const layout = verticalRun();
    const { physicalShelfIds } = focusGroupFor(layout, "front-1");
    expect(physicalShelfIds).toEqual(["front-0", "front-1", "front-2"]);
    expect(physicalShelfIds[1]).toBe("front-1");
  });

  it("groups a back-half target with the back halves of its own neighbours", () => {
    const layout = verticalRun();
    const { physicalShelfIds } = focusGroupFor(layout, "back-0");
    expect(physicalShelfIds).toHaveLength(3);
    expect(physicalShelfIds).toContain("back-0");
    expect(physicalShelfIds.every((id) => id.startsWith("back-"))).toBe(true);
  });

  it("returns the target alone when the layout has a single gondola", () => {
    const layout = verticalRun({ count: 1 });
    layout.shelves = layout.shelves.filter((s) => !s.id.startsWith("other-col"));
    const { physicalShelfIds } = focusGroupFor(layout, "front-0");
    expect(physicalShelfIds).toEqual(["front-0"]);
  });
});
