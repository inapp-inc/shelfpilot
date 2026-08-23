import test from "node:test";
import assert from "node:assert/strict";
import {
  aisleBadgeMinRadiusUserUnits,
  routeDashPatternUserUnits,
  routeStrokeScreenPx,
  routeStrokeUserUnits,
  runwayBandsForMap,
  schematicAisleFontSize,
  schematicFontSize,
  shelfTilesForMap,
} from "../../web/src/shopper/shopperSchematicMap.js";
import {
  MIN_GUIDED_SPAN_M,
  expandViewBoxForPoints,
  fitLayoutScale,
  fitViewBoxToAspect,
  focusViewBoxForGuidedRoute,
  guidedStoreShare,
} from "../../web/src/shopper/shopperMapFraming.js";
import {
  badgeClearOfEntrance,
  buildStorePlanScene,
  combinedFixtureLabel,
  findPlanFixture,
} from "../../web/src/shopper/shopperStorePlan.js";

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
  assert.ok(Math.abs(bands[0].h - 1.2) < 0.25, "aisle band is the walk corridor, not the shelf union");
  assert.ok(bands[0].badge?.x != null, "each aisle gets one centred badge");

  const tiles = shelfTilesForMap(layout);
  assert.equal(tiles.length, 3);
  assert.ok(tiles.every((t) => t.label && t.aabb.w > 0));
  assert.ok(tiles.every((t) => t.corners?.length === 4), "each shelf is the exact rotated footprint");

  const rotated = shelfTilesForMap({
    ...layout,
    shelves: [{ id: "rot", x: 6, y: 5, widthMeters: 2, depthMeters: 0.5, rotationDeg: 35, aisleId: "a1" }],
  });
  assert.equal(rotated[0].corners.length, 4);
  const xs = rotated[0].corners.map((c) => c.x);
  assert.ok(Math.max(...xs) - Math.min(...xs) > 1.6, "rotated shelf is not drawn as a fat AABB box");

  const fs = schematicFontSize(32, 22);
  assert.ok(fs >= 0.5, "label font should be readable in viewBox units");
});

test("route stroke and aisle badge scale for kiosk readability", () => {
  const vbW = 32;
  const stroke = routeStrokeUserUnits(vbW, { minPx: 12, renderWidthPx: 560 });
  assert.ok(routeStrokeScreenPx(stroke, vbW, 560) >= 12, "route stroke should be at least 12px wide");

  const dash = routeDashPatternUserUnits(vbW);
  assert.ok(dash.dash > 0.4, "dash segment should be visible in user units");
  assert.ok(dash.period > dash.dash, "dash pattern includes a gap");

  const aisleFs = schematicAisleFontSize(vbW, 22, 1.2);
  const badgeR = aisleBadgeMinRadiusUserUnits(vbW);
  assert.ok(aisleFs >= 0.38 && aisleFs <= 0.82, "aisle badge font stays compact");
  assert.ok(badgeR <= (30 * vbW) / 560, "aisle badge radius stays smaller on kiosk");
});

test("store plan scene mirrors the layout editor's 2D view", () => {
  const layout = {
    widthMeters: 30,
    depthMeters: 20,
    aisles: [
      { id: "a1", orientation: "vertical", x: 8, y: 4, widthMeters: 1.2, lengthMeters: 12, aisleNumber: 1, name: "Produce" },
      { id: "a2", orientation: "vertical", x: 14, y: 4, widthMeters: 1.2, lengthMeters: 12, aisleNumber: 2, name: "Dairy" },
    ],
    shelves: [
      { id: "s1", x: 7.2, y: 5, widthMeters: 1.2, depthMeters: 0.6, rotationDeg: 0, aisleId: "a1", shelfIndexAlongAisle: 0, categoryId: "cat-produce" },
      { id: "s2", x: 7.2, y: 7, widthMeters: 1.2, depthMeters: 0.6, rotationDeg: 35, aisleId: "a1", shelfIndexAlongAisle: 1 },
      { id: "s3", x: 15.2, y: 6, widthMeters: 1.2, depthMeters: 0.6, rotationDeg: 0, aisleId: "a2", shelfIndexAlongAisle: 0 },
    ],
  };
  const categories = [{ id: "cat-produce", name: "Produce", color: "#16A34A" }];

  const scene = buildStorePlanScene(layout, { x: 10, y: 18, assumed: true }, categories);

  assert.equal(scene.corridors.length, 2, "aisle corridors are drawn as walkable bands");
  assert.equal(scene.corridors[0].label, "1");
  assert.equal(scene.fixtures.length, 3, "every fixture is drawn");
  assert.ok(scene.floor.widthMeters > 0 && scene.floor.depthMeters > 0, "fixture-zone floor is sized");
  assert.ok(scene.vb.width >= 30, "view box covers the whole store");

  const rotated = scene.fixtures.find((f) => f.id === "s2");
  assert.equal(rotated.corners.length, 4, "shelves keep their exact rotated footprint");
  const xs = rotated.corners.map((c) => c.x);
  assert.ok(Math.max(...xs) - Math.min(...xs) > 1.2, "a rotated shelf is not squared off into its AABB");

  const produce = scene.fixtures.find((f) => f.id === "s1");
  assert.equal(produce.faces[0].color, "#16A34A", "faces take the category colour, like the editor");
  assert.ok(produce.faces[0].fill.startsWith("#16A34A"), "fill is the category colour with alpha");
  assert.ok(produce.faces[0].label, "faces carry the editor shelf code");

  const hit = findPlanFixture(scene.fixtures, "s3", null);
  assert.equal(hit?.fixture?.id, "s3", "target shelf resolves to its fixture");
  assert.ok(hit.fixture.aabb.w > 0, "target exposes a footprint for route framing");
});

test("gondola faces get separate halves so their codes never overlap", () => {
  const layout = {
    widthMeters: 20,
    depthMeters: 14,
    aisles: [
      { id: "a1", orientation: "horizontal", x: 1, y: 2, widthMeters: 1.4, lengthMeters: 12, aisleNumber: 1 },
      { id: "a2", orientation: "horizontal", x: 1, y: 5, widthMeters: 1.4, lengthMeters: 12, aisleNumber: 2 },
    ],
    // A gondola pair: two shelves sharing one footprint, facing opposite aisles.
    shelves: [
      {
        id: "front",
        pairId: "p1",
        pairRole: "front",
        x: 3,
        y: 3.4,
        widthMeters: 1.2,
        usableWidthMeters: 1.2,
        depthMeters: 0.6,
        rotationDeg: 0,
        aisleId: "a1",
        shelfIndexAlongAisle: 0,
      },
      {
        id: "back",
        pairId: "p1",
        pairRole: "back",
        x: 4.2,
        y: 4,
        widthMeters: 1.2,
        usableWidthMeters: 1.2,
        depthMeters: 0.6,
        rotationDeg: 180,
        aisleId: "a2",
        shelfIndexAlongAisle: 0,
      },
    ],
  };

  const scene = buildStorePlanScene(layout, null, []);
  assert.equal(scene.fixtures.length, 1, "the pair renders as one fixture");
  const [gondola] = scene.fixtures;
  assert.equal(gondola.faces.length, 2);

  const [a, b] = gondola.faces;
  assert.notDeepEqual(a.at, b.at, "each face gets its own half of the footprint");
  assert.ok(Math.abs(a.at.y - b.at.y) >= 0.25, "face labels are separated across the shelf depth");
  assert.equal(a.label, "1A", "front face is labelled for the aisle it serves");
  assert.equal(b.label, "2A", "back face is labelled for the opposite aisle");
  assert.equal(gondola.displayLabel, "1A/2A", "both bays survive in the combined code");
  assert.ok(gondola.spine, "a spine separates the two faces, as in the 2D editor");
});

test("combined shelf codes stay compact and aisle badges dodge the entrance", () => {
  assert.equal(combinedFixtureLabel([{ label: "4C" }]), "4C");
  assert.equal(combinedFixtureLabel([{ label: "4C" }, { label: "4D" }]), "4C/D");
  assert.equal(combinedFixtureLabel([{ label: "4C" }, { label: "12A" }]), "4C/12A");

  const band = { w: 12, h: 1.4, badge: { x: 7, y: 2.7, rotate: 0 } };
  assert.deepEqual(badgeClearOfEntrance(band, { x: 1, y: 12 }), band.badge, "a distant entrance moves nothing");

  const nudged = badgeClearOfEntrance(band, { x: 7, y: 2.4 });
  assert.notEqual(nudged.x, band.badge.x, "a badge under the entrance slides along its corridor");
  assert.equal(nudged.y, band.badge.y, "and stays inside the corridor");
});

test("fitLayoutScale fills the host without cropping the store", () => {
  const bounds = { width: 40, height: 20 };
  const scale = fitLayoutScale(bounds, 800, 400, 0);
  assert.equal(scale, 20, "the shorter host side sets the scale");
  assert.equal(fitLayoutScale(bounds, 0, 400), 0);
  assert.ok(fitLayoutScale(bounds, 200, 80, 8) < 4, "padding keeps a margin around the plan");
});

test("fitViewBoxToAspect letterboxes layout to screen ratio", () => {
  const wideContent = { minX: 0, minY: 0, width: 40, height: 20 };
  const tallScreen = fitViewBoxToAspect(wideContent, 9 / 16);
  assert.ok(tallScreen.height > wideContent.height, "tall screen expands view box height");

  const tallContent = { minX: 0, minY: 0, width: 20, height: 40 };
  const wideScreen = fitViewBoxToAspect(tallContent, 16 / 9);
  assert.ok(wideScreen.width > tallContent.width, "wide screen expands view box width");
});

const ENTRY_POINT = { x: 10, y: 40, plaza: { x: 8.5, y: 39, w: 3, h: 0, d: 2 } };
const ROUTE = [
  { x: 10, y: 40 },
  { x: 10, y: 30 },
  { x: 18, y: 30 },
];
const MARKER_POINT = { x: 18.6, y: 29.4 };
const TARGET_AABB = { x: 18.4, y: 28.9, w: 0.5, h: 0.9 };

function assertRouteInFrame(vb) {
  const maxX = vb.minX + vb.width;
  const maxY = vb.minY + vb.height;
  const inside = (x, y) => x >= vb.minX && x <= maxX && y >= vb.minY && y <= maxY;

  for (const p of ROUTE) assert.ok(inside(p.x, p.y), `route vertex ${p.x},${p.y} stays in frame`);
  assert.ok(inside(ENTRY_POINT.x, ENTRY_POINT.y), "entrance marker stays in frame");
  assert.ok(inside(ENTRY_POINT.plaza.x, ENTRY_POINT.plaza.y), "entrance plaza stays in frame");
  assert.ok(inside(MARKER_POINT.x, MARKER_POINT.y), "destination pin stays in frame");
  assert.ok(
    inside(TARGET_AABB.x + TARGET_AABB.w, TARGET_AABB.y + TARGET_AABB.h),
    "target shelf stays in frame"
  );
}

test("a normal store keeps its whole plan on screen while guiding", () => {
  const fullVb = { minX: -2, minY: -2, width: 60, height: 44 };

  const vb = focusViewBoxForGuidedRoute(fullVb, ROUTE, ENTRY_POINT, MARKER_POINT, TARGET_AABB, {
    storeShare: guidedStoreShare(fullVb.width),
  });

  assert.equal(vb.width, fullVb.width, "the shopper still sees the whole store");
  assert.equal(vb.height, fullVb.height);
  assertRouteInFrame(vb);
});

test("a very large store zooms toward the route but stays over the plan", () => {
  const fullVb = { minX: -2, minY: -2, width: 160, height: 120 };

  const vb = focusViewBoxForGuidedRoute(fullVb, ROUTE, ENTRY_POINT, MARKER_POINT, TARGET_AABB, {
    storeShare: guidedStoreShare(fullVb.width),
  });

  assert.ok(vb.width < fullVb.width, "a warehouse-sized plan zooms in rather than showing everything");
  assert.ok(vb.minX >= fullVb.minX - 1e-9, "the frame does not slide off the plan");
  assert.ok(vb.minY + vb.height <= fullVb.minY + fullVb.height + 1e-9);
  assertRouteInFrame(vb);
});

test("guided framing clamps short routes to a minimum span", () => {
  const fullVb = { minX: 0, minY: 0, width: 60, height: 44 };
  const shortRoute = [
    { x: 20, y: 20 },
    { x: 21.5, y: 20 },
  ];
  const opts = { storeShare: 0 };

  const vb = focusViewBoxForGuidedRoute(fullVb, shortRoute, { x: 20, y: 20 }, null, null, opts);

  assert.ok(vb.width >= MIN_GUIDED_SPAN_M, "a two-step route does not over-zoom horizontally");
  assert.ok(vb.height >= MIN_GUIDED_SPAN_M, "a two-step route does not over-zoom vertically");
  assert.ok(Math.abs(vb.minX + vb.width / 2 - 20.75) < 0.01, "clamped frame stays centred on the route");

  const relaxed = focusViewBoxForGuidedRoute(fullVb, shortRoute, { x: 20, y: 20 }, null, null, {
    ...opts,
    minSpanMeters: 4,
  });
  assert.ok(relaxed.width < vb.width, "the clamp is caller-tunable");
});

test("expandViewBoxForPoints keeps route endpoints inside frame", () => {
  const vb = { minX: 0, minY: 0, width: 20, height: 20 };
  const expanded = expandViewBoxForPoints(vb, [{ x: 24, y: 18 }], 1);
  assert.ok(expanded.minX + expanded.width >= 25);
  assert.ok(expanded.minY + expanded.height >= 19);
});
