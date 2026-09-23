import { describe, expect, it } from "vitest";
import {
  mergePairedShelfForCanvas,
  planogramForScene3dFromPhysicalLayout,
  planogramForScene3dUnit,
} from "./shelfFaces.js";

describe("planogram 3D resolution", () => {
  it("reads placements from the physical shelf record (planogram API path)", () => {
    const layout = {
      shelves: [
        {
          id: "s1",
          doubleSided: false,
          levels: [{ levelIndex: 0, heightFromFloorMeters: 0.35 }],
          faces: [
            {
              id: "A",
              planogram: [{ id: "pl1", productId: "prod-1", levelIndex: 0, facings: 2 }],
            },
          ],
        },
      ],
    };
    const rows = planogramForScene3dFromPhysicalLayout(layout, "s1", "A");
    expect(rows).toHaveLength(1);
    expect(rows[0].productId).toBe("prod-1");
  });

  it("resolves gondola focus shelf from layout.shelves, not stale merged face copies", () => {
    const layout = {
      shelves: [
        {
          id: "front",
          pairId: "p1",
          pairRole: "front",
          aisleId: "a1",
          levels: [{ levelIndex: 0, heightFromFloorMeters: 0.4 }],
          faces: [{ id: "A", planogram: [] }],
        },
        {
          id: "back",
          pairId: "p1",
          pairRole: "back",
          aisleId: "a2",
          levels: [{ levelIndex: 0, heightFromFloorMeters: 0.4 }],
          faces: [
            {
              id: "A",
              planogram: [{ id: "pl2", productId: "prod-2", levelIndex: 0, facings: 1 }],
            },
          ],
        },
      ],
    };
    const unit = mergePairedShelfForCanvas(layout.shelves[0], layout.shelves[1]);
    expect(planogramForScene3dUnit(unit, layout, "A")).toHaveLength(0);
    expect(planogramForScene3dFromPhysicalLayout(layout, "back", "B")).toHaveLength(1);
    expect(planogramForScene3dUnit(unit, layout, "B")).toHaveLength(1);
  });
});
