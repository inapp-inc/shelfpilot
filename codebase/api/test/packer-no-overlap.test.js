import assert from "node:assert/strict";
import test from "node:test";
import { applyFixtureTypesToShelves } from "../src/services/categoryFixtureDefaults.js";
import { packAislesAndShelves } from "../src/services/layoutPacker.js";
import { shelfFloorFootprint } from "../src/services/polygonContainment.js";
import { oppositeShelfOrigin } from "../src/services/shelfFaces.js";

function rectLayout(w, d) {
  return {
    widthMeters: w,
    depthMeters: d,
    shape: "polygon",
    polygon: [
      { x: 0, y: 0 },
      { x: w, y: 0 },
      { x: w, y: d },
      { x: 0, y: d },
    ],
  };
}

function countCrossPairOverlaps(shelves) {
  function overlaps(a, b) {
    return !(
      a.x + a.w <= b.x + 1e-6 ||
      b.x + b.w <= a.x + 1e-6 ||
      a.y + a.d <= b.y + 1e-6 ||
      b.y + b.d <= a.y + 1e-6
    );
  }
  const fps = shelves.map((s) => ({ s, fp: shelfFloorFootprint(s) }));
  let n = 0;
  for (let i = 0; i < fps.length; i += 1) {
    for (let j = i + 1; j < fps.length; j += 1) {
      if (fps[i].s.pairId && fps[i].s.pairId === fps[j].s.pairId) continue;
      if (overlaps(fps[i].fp, fps[j].fp)) n += 1;
    }
  }
  return n;
}

test("applyFixtureTypesToShelves preserves packed floor footprint", () => {
  const shelves = [
    {
      id: "a",
      pairId: "p1",
      pairRole: "front",
      type: "gondola",
      categoryId: "hm-fresh",
      x: 1,
      y: 1,
      rotationDeg: 0,
      usableWidthMeters: 0.9,
      widthMeters: 0.9,
      depthMeters: 0.9,
      heightMeters: 2,
      faces: [{ id: "A", categoryId: "hm-fresh", planogram: [] }],
      levels: [],
      planogram: [],
    },
    {
      id: "b",
      pairId: "p1",
      pairRole: "back",
      type: "gondola",
      categoryId: "hm-grocery",
      ...oppositeShelfOrigin(1, 1, 0, 0.9, 0.9),
      usableWidthMeters: 0.9,
      widthMeters: 0.9,
      depthMeters: 0.9,
      heightMeters: 2,
      faces: [{ id: "A", categoryId: "hm-grocery", planogram: [] }],
      levels: [],
      planogram: [],
    },
  ];
  const config = {
    fixtureTemplates: [
      { type: "gondola", defaultWidthMeters: 1.8, defaultDepthMeters: 0.9, defaultLevels: 3 },
      { type: "storage", defaultWidthMeters: 2.0, defaultDepthMeters: 1.0, defaultLevels: 2 },
    ],
  };
  const out = applyFixtureTypesToShelves(
    shelves,
    [
      { categoryId: "hm-fresh", percent: 50 },
      { categoryId: "hm-grocery", percent: 50 },
    ],
    [
      { id: "hm-fresh", name: "Fresh" },
      { id: "hm-grocery", name: "Grocery" },
    ],
    config
  );
  for (const s of out) {
    assert.equal(Number(s.widthMeters), 0.9, "must not grow stub bay to template width");
    assert.equal(Number(s.depthMeters), 0.9, "must not change packed depth");
  }
  assert.equal(countCrossPairOverlaps(out), 0);
});

test("smart generate pipeline has no cross-pair shelf overlaps", () => {
  const layout = rectLayout(23.1, 15);
  const packed = packAislesAndShelves(layout, {
    orientation: "mixed",
    minAisleWidthMeters: 1.5,
    compactMode: true,
    fillRemaining: true,
    shelfTemplate: { type: "gondola", usableWidthMeters: 1.8, depthMeters: 0.9, defaultLevels: 3 },
    fillTemplates: [
      { type: "gondola", defaultWidthMeters: 1.8, defaultDepthMeters: 0.9 },
      { type: "shelf", defaultWidthMeters: 1.2, defaultDepthMeters: 0.6 },
      { type: "storage", defaultWidthMeters: 0.9, defaultDepthMeters: 0.6 },
    ],
  });
  assert.ok(packed.shelfCount > 20);
  assert.equal(countCrossPairOverlaps(packed.shelves), 0, "packer must not emit overlaps");

  const assigned = packed.shelves.map((s, i) => ({
    ...s,
    categoryId: i % 2 ? "hm-fresh" : "hm-grocery",
    faces: [{ id: "A", categoryId: i % 2 ? "hm-fresh" : "hm-grocery", planogram: [] }],
  }));
  const typed = applyFixtureTypesToShelves(
    assigned,
    [
      { categoryId: "hm-fresh", percent: 50 },
      { categoryId: "hm-grocery", percent: 50 },
    ],
    [
      { id: "hm-fresh", name: "Fresh Produce" },
      { id: "hm-grocery", name: "Grocery" },
    ],
    {
      fixtureTemplates: [
        { type: "gondola", defaultWidthMeters: 1.8, defaultDepthMeters: 0.9, defaultLevels: 3 },
        { type: "shelf", defaultWidthMeters: 1.2, defaultDepthMeters: 0.6, defaultLevels: 2 },
        { type: "storage", defaultWidthMeters: 2.0, defaultDepthMeters: 1.0, defaultLevels: 2 },
      ],
    }
  );
  assert.equal(countCrossPairOverlaps(typed), 0, "category typing must not create overlaps");
});
