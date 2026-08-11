import test from "node:test";
import assert from "node:assert/strict";
import { runwayBandsForMap, shelfTilesForMap, schematicFontSize } from "../../web/src/shopper/shopperSchematicMap.js";

test("schematic map builds runway bands and readable label scale", () => {
  const layout = {
    widthMeters: 30,
    depthMeters: 20,
    aisles: [
      { id: "a1", orientation: "horizontal", x: 4, y: 4, widthMeters: 1.2, lengthMeters: 20, aisleNumber: 1 },
      { id: "a2", orientation: "horizontal", x: 4, y: 8, widthMeters: 1.2, lengthMeters: 20, aisleNumber: 2 },
    ],
    shelves: [
      { id: "s1", x: 5, y: 3.2, widthMeters: 1.2, depthMeters: 0.6, rotationDeg: 0, aisleId: "a1", shelfIndexAlongAisle: 0 },
      { id: "s2", x: 7, y: 3.2, widthMeters: 1.2, depthMeters: 0.6, rotationDeg: 0, aisleId: "a1", shelfIndexAlongAisle: 1 },
      { id: "s3", x: 5, y: 7.2, widthMeters: 1.2, depthMeters: 0.6, rotationDeg: 0, aisleId: "a2", shelfIndexAlongAisle: 0 },
    ],
  };

  const bands = runwayBandsForMap(layout);
  assert.equal(bands.length, 2);
  assert.equal(bands[0].label, "1");
  assert.ok(bands[0].w > 2);

  const tiles = shelfTilesForMap(layout);
  assert.equal(tiles.length, 3);
  assert.ok(tiles.every((t) => t.label && t.aabb.w > 0));

  const fs = schematicFontSize(32, 22);
  assert.ok(fs >= 0.28, "label font should be readable in viewBox units");
});
