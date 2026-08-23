import test from "node:test";
import assert from "node:assert/strict";
import { collectLayoutPlacements } from "../../web/src/layout-editor/placementIndex.js";

test("collectLayoutPlacements counts one row per physical planogram slot", () => {
  const banana = "prod-banana";
  const layout = {
    aisles: [{ id: "a1", aisleNumber: 1, orientation: "vertical", x: 8, y: 4, widthMeters: 1.2, lengthMeters: 8 }],
    shelves: [
      {
        id: "s-front",
        pairId: "pair-1",
        pairRole: "front",
        aisleId: "a1",
        x: 7,
        y: 5,
        widthMeters: 1.2,
        depthMeters: 0.6,
        rotationDeg: 0,
        displayNumber: 1,
        faces: [{ id: "A", planogram: [{ productId: banana, levelIndex: 0, facings: 1 }] }],
      },
      {
        id: "s-back",
        pairId: "pair-1",
        pairRole: "back",
        aisleId: "a1",
        x: 7,
        y: 6,
        widthMeters: 1.2,
        depthMeters: 0.6,
        rotationDeg: 180,
        displayNumber: 1,
        faces: [{ id: "A", planogram: [] }],
      },
      {
        id: "s-pair",
        pairDisplay: true,
        pairId: "pair-1",
        pairShelfIds: { front: "s-front", back: "s-back" },
        aisleId: "a1",
        x: 7,
        y: 5.5,
        widthMeters: 1.2,
        depthMeters: 1.2,
        rotationDeg: 0,
        displayNumber: 1,
        faces: [
          { id: "A", planogram: [{ productId: banana, levelIndex: 0, facings: 1 }] },
          { id: "B", planogram: [{ productId: banana, levelIndex: 0, facings: 1 }] },
        ],
      },
    ],
  };
  const products = [{ id: banana, name: "Banana Bunch", sku: "BAN-1", categoryId: "c1" }];
  const rows = collectLayoutPlacements(layout, products, []);
  const bananaRows = rows.filter((r) => r.productId === banana);
  assert.equal(bananaRows.length, 1, "ignore pairDisplay mirror; one physical placement only");
  assert.equal(bananaRows[0].shelfId, "s-front");
});

test("collectLayoutPlacements drops mirrored back-half copy of same gondola slot", () => {
  const banana = "prod-banana";
  const layout = {
    aisles: [{ id: "a1", aisleNumber: 3, orientation: "vertical", x: 8, y: 4, widthMeters: 1.2, lengthMeters: 8 }],
    shelves: [
      {
        id: "s-front",
        pairId: "pair-3",
        pairRole: "front",
        aisleId: "a1",
        shelfIndexAlongAisle: 0,
        x: 7,
        y: 5,
        widthMeters: 1.2,
        depthMeters: 0.6,
        rotationDeg: 0,
        faces: [{ id: "A", planogram: [{ productId: banana, levelIndex: 0, facings: 1 }] }],
      },
      {
        id: "s-back",
        pairId: "pair-3",
        pairRole: "back",
        aisleId: "a1",
        shelfIndexAlongAisle: 1,
        x: 7,
        y: 6,
        widthMeters: 1.2,
        depthMeters: 0.6,
        rotationDeg: 180,
        faces: [{ id: "A", planogram: [{ productId: banana, levelIndex: 0, facings: 1 }] }],
      },
    ],
  };
  const products = [{ id: banana, name: "Banana Bunch", sku: "BAN-1", categoryId: "c1" }];
  const rows = collectLayoutPlacements(layout, products, []);
  assert.equal(rows.filter((r) => r.productId === banana).length, 1);
});

test("collectLayoutPlacements editor mode lists every physical shelf separately", () => {
  const apple = "prod-apple";
  const layout = {
    aisles: [{ id: "a1", aisleNumber: 1, orientation: "vertical", x: 8, y: 4, widthMeters: 1.2, lengthMeters: 8 }],
    shelves: [
      {
        id: "s-front-1",
        pairId: "pair-1",
        pairRole: "front",
        aisleId: "a1",
        shelfIndexAlongAisle: 0,
        planogram: [{ productId: apple, levelIndex: 0, facings: 1 }],
      },
      {
        id: "s-back-1",
        pairId: "pair-1",
        pairRole: "back",
        aisleId: "a1",
        shelfIndexAlongAisle: 1,
        planogram: [{ productId: apple, levelIndex: 0, facings: 1 }],
      },
      {
        id: "s-front-2",
        pairId: "pair-2",
        pairRole: "front",
        aisleId: "a1",
        shelfIndexAlongAisle: 2,
        planogram: [{ productId: apple, levelIndex: 1, facings: 2 }],
      },
    ],
  };
  const products = [{ id: apple, name: "Red Apple", sku: "APL-1", categoryId: "c1" }];
  const rows = collectLayoutPlacements(layout, products, [], { dedupeGondolaMirrors: false });
  assert.equal(rows.filter((r) => r.productId === apple).length, 3);
});

test("collectLayoutPlacements lists both gondola halves when both have products", () => {
  const apple = "prod-apple";
  const banana = "prod-banana";
  const layout = {
    aisles: [{ id: "a1", aisleNumber: 2, orientation: "vertical", x: 8, y: 4, widthMeters: 1.2, lengthMeters: 8 }],
    shelves: [
      {
        id: "s-front",
        pairId: "pair-2",
        pairRole: "front",
        aisleId: "a1",
        x: 7,
        y: 5,
        widthMeters: 1.2,
        depthMeters: 0.6,
        rotationDeg: 0,
        displayNumber: 2,
        planogram: [{ productId: apple, levelIndex: 0, facings: 2 }],
      },
      {
        id: "s-back",
        pairId: "pair-2",
        pairRole: "back",
        aisleId: "a1",
        x: 7,
        y: 6,
        widthMeters: 1.2,
        depthMeters: 0.6,
        rotationDeg: 180,
        displayNumber: 2,
        planogram: [{ productId: banana, levelIndex: 1, facings: 1 }],
      },
    ],
  };
  const products = [
    { id: apple, name: "Red Apple", sku: "APL-1", categoryId: "c1" },
    { id: banana, name: "Banana Bunch", sku: "BAN-1", categoryId: "c1" },
  ];
  const rows = collectLayoutPlacements(layout, products, []);
  assert.equal(rows.filter((r) => r.productId === apple).length, 1);
  assert.equal(rows.filter((r) => r.productId === banana).length, 1);
});

test("collectLayoutPlacements merges duplicate catalog names on different shelves", () => {
  const layout = {
    vertical: "hypermarket",
    aisles: [
      { id: "a1", aisleNumber: 2, orientation: "vertical", x: 8, y: 4, widthMeters: 1.2, lengthMeters: 8 },
    ],
    shelves: [
      {
        id: "s-banana-a",
        pairId: "pair-1",
        pairRole: "back",
        aisleId: "a1",
        shelfIndexAlongAisle: 6,
        planogram: [{ id: "pog-a", productId: "prd-54cb44", levelIndex: 0, facings: 10 }],
      },
      {
        id: "s-banana-b",
        pairId: "pair-2",
        pairRole: "back",
        aisleId: "a1",
        shelfIndexAlongAisle: 8,
        planogram: [{ id: "pog-b", productId: "hm-banana-bunch", levelIndex: 0, facings: 16 }],
      },
    ],
  };
  const products = [
    { id: "prd-54cb44", name: "Banana Bunch", sku: "FRU-BAN-002", categoryId: "cat-fruits" },
    { id: "hm-banana-bunch", name: "Banana Bunch", sku: "IMG-HM-BANANA-BUNCH", categoryId: "hm-fresh" },
  ];
  const categories = [
    { id: "cat-fruits", vertical: "retail" },
    { id: "hm-fresh", vertical: "hypermarket" },
  ];
  const rows = collectLayoutPlacements(layout, products, categories, { dedupeGondolaMirrors: false });
  const bananaRows = rows.filter((r) => r.productName === "Banana Bunch");
  assert.equal(bananaRows.length, 2);
  assert.equal(bananaRows[0].productId, "hm-banana-bunch");
  assert.equal(bananaRows[1].productId, "hm-banana-bunch");
  assert.equal(new Set(bananaRows.map((r) => r.shelfId)).size, 2);
});
