import { describe, expect, it } from "vitest";
import { levelsForScene3dUnit } from "./scene3dDimensions.js";
import { mergePairedShelfForCanvas } from "./layout-editor/shelfFaces.js";

describe("levelsForScene3dUnit", () => {
  it("uses the clicked physical shelf level list (matches planogram editor)", () => {
    const layout = {
      shelves: [
        {
          id: "front",
          pairId: "p1",
          pairRole: "front",
          aisleId: "a1",
          levels: [
            { levelIndex: 0, heightFromFloorMeters: 0.2 },
            { levelIndex: 1, heightFromFloorMeters: 0.8 },
            { levelIndex: 2, heightFromFloorMeters: 1.4 },
            { levelIndex: 3, heightFromFloorMeters: 2.0 },
          ],
          faces: [{ id: "A", planogram: [{ productId: "x", levelIndex: 0, facings: 1 }] }],
        },
        {
          id: "back",
          pairId: "p1",
          pairRole: "back",
          aisleId: "a2",
          levels: [
            { levelIndex: 0, heightFromFloorMeters: 0.2 },
            { levelIndex: 1, heightFromFloorMeters: 0.8 },
          ],
          faces: [{ id: "A", planogram: [] }],
        },
      ],
    };
    const unit = mergePairedShelfForCanvas(layout.shelves[0], layout.shelves[1]);
    const frontLevels = levelsForScene3dUnit(unit, layout, "A");
    expect(frontLevels.levels).toHaveLength(4);
    expect(frontLevels.hasConfiguredLevels).toBe(true);

    const backLevels = levelsForScene3dUnit(unit, layout, "B");
    expect(backLevels.levels).toHaveLength(2);
  });
});
