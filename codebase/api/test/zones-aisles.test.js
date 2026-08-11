import assert from "node:assert/strict";
import test from "node:test";
import { packAislesAndShelves } from "../src/services/layoutPacker.js";
import {
  aisleFootprint,
  entityInsideLayout,
  zoneFootprint,
  aisleOverlapsShelf,
  collectOverlapViolations,
  overlapsAnyShelf,
} from "../src/services/polygonContainment.js";
import { normalizeEntryPoint, normalizeZone, normalizeZoneType } from "../src/services/zones.js";
import { normalizeLayout } from "../src/services/layoutNormalize.js";
import { resetDbForTests, repo } from "../src/store/sqlite.js";

const RECT = {
  widthMeters: 14,
  depthMeters: 12,
  shape: "polygon",
  polygon: [
    { x: 0, y: 0 },
    { x: 14, y: 0 },
    { x: 14, y: 12 },
    { x: 0, y: 12 },
  ],
};

test("horizontal aisle footprint maps length to X", () => {
  const fp = aisleFootprint({ x: 1, y: 2, widthMeters: 1.2, lengthMeters: 8, orientation: "horizontal" });
  assert.equal(fp.w, 8);
  assert.equal(fp.d, 1.2);
});

test("vertical aisle footprint maps length to Y", () => {
  const fp = aisleFootprint({ x: 1, y: 2, widthMeters: 1.2, lengthMeters: 8, orientation: "vertical" });
  assert.equal(fp.w, 1.2);
  assert.equal(fp.d, 8);
});

test("packer tags generated aisles with an orientation and reports counts", () => {
  const { aisles, aisleCount, shelfCount } = packAislesAndShelves(RECT, { minAisleWidthMeters: 1.2 });
  assert.ok(aisles.length >= 1, "expected at least one aisle");
  assert.equal(aisleCount, aisles.length);
  assert.ok(shelfCount >= 1);
  for (const a of aisles) {
    assert.ok(["horizontal", "vertical"].includes(a.orientation));
  }
});

test("mixed orientation includes walk aisles across the fixture area", () => {
  const { aisles, shelfCount } = packAislesAndShelves(RECT, {
    minAisleWidthMeters: 1.2,
    orientation: "mixed",
  });
  assert.ok(shelfCount >= 1, "mixed should place shelves");
  assert.ok(aisles.length >= 2, "mixed should keep walk aisles");
  const orients = new Set(aisles.map((a) => a.orientation));
  assert.ok(
    orients.has("horizontal") || orients.has("vertical"),
    "mixed layout should include oriented walk aisles"
  );
});

test("mixed orientation fills comparably without requiring crossed shelf runs", () => {
  const horizontal = packAislesAndShelves(RECT, {
    orientation: "horizontal",
    minAisleWidthMeters: 1.2,
    shelfTemplate: { type: "shelf", usableWidthMeters: 1.2, depthMeters: 0.6 },
  });
  const mixed = packAislesAndShelves(RECT, {
    orientation: "mixed",
    minAisleWidthMeters: 1.2,
    shelfTemplate: { type: "shelf", usableWidthMeters: 1.2, depthMeters: 0.6 },
  });
  assert.ok(mixed.shelfCount >= horizontal.shelfCount * 0.9, "mixed should fill like pure modes");
  assert.ok(mixed.aisles.length >= 1);
});

test("autogen gondola bands place double-sided shelves between walk aisles", () => {
  const { aisles, shelves } = packAislesAndShelves(RECT, {
    orientation: "horizontal",
    minAisleWidthMeters: 1.2,
    shelfTemplate: { type: "gondola", usableWidthMeters: 1.2, depthMeters: 0.6 },
  });
  assert.ok(shelves.length >= 2, "expected front+back shelf pairs");
  assert.ok(aisles.filter((a) => a.orientation === "horizontal").length >= 2, "paired aisles per band");
  const pairs = new Map();
  for (const s of shelves) {
    assert.ok(s.pairId, "each shelf should belong to a front/back pair");
    assert.ok(s.pairRole === "front" || s.pairRole === "back");
    assert.equal(s.doubleSided, false);
    assert.equal(s.faces?.length, 1);
    if (!pairs.has(s.pairId)) pairs.set(s.pairId, {});
    pairs.get(s.pairId)[s.pairRole] = s;
  }
  assert.ok(pairs.size >= 1);
  for (const [, pair] of pairs) {
    assert.ok(pair.front && pair.back, "pair must have front and back shelves");
    assert.equal(pair.front.displayNumber, pair.back.displayNumber);
    const rotDiff = Math.abs(((pair.back.rotationDeg - pair.front.rotationDeg) % 360 + 360) % 360);
    assert.equal(rotDiff, 180, "back shelf faces opposite direction");
  }
});

test("vertical-run aisles stay inside a tall polygon", () => {
  const tall = {
    widthMeters: 8,
    depthMeters: 20,
    shape: "polygon",
    polygon: [
      { x: 0, y: 0 },
      { x: 8, y: 0 },
      { x: 8, y: 20 },
      { x: 0, y: 20 },
    ],
  };
  const { aisles, orientation } = packAislesAndShelves(tall, { minAisleWidthMeters: 1.2, orientation: "vertical" });
  assert.equal(orientation, "vertical");
  for (const a of aisles) {
    assert.ok(entityInsideLayout(a, "aisle", tall), "vertical aisle should be inside polygon");
  }
});

test("packer keeps aisles off shelf footprints", () => {
  const { aisles, shelves } = packAislesAndShelves(RECT, { minAisleWidthMeters: 1.2 });
  const layout = { ...RECT, aisles, shelves };
  assert.equal(collectOverlapViolations(layout).length, 0);
  for (const a of aisles) {
    assert.equal(overlapsAnyShelf(a, layout), null);
  }
});

test("aisle overlapping a shelf is detected", () => {
  const shelf = {
    id: "shf-1",
    x: 2,
    y: 2,
    usableWidthMeters: 1.2,
    widthMeters: 1.2,
    depthMeters: 0.6,
    rotationDeg: 0,
  };
  const aisle = {
    id: "aisle-1",
    x: 2,
    y: 2,
    widthMeters: 1.2,
    lengthMeters: 4,
    orientation: "horizontal",
  };
  const layout = { ...RECT, shelves: [shelf], aisles: [aisle] };
  assert.ok(aisleOverlapsShelf(aisle, shelf, layout));
  assert.equal(collectOverlapViolations(layout).length, 1);
});

test("minimum aisle width is clamped to a walkable value", () => {
  const { aisles } = packAislesAndShelves(RECT, { minAisleWidthMeters: 0.3 });
  for (const a of aisles) {
    assert.ok(a.widthMeters >= 0.9, `aisle width ${a.widthMeters} should be >= 0.9`);
  }
});

test("normalizeZoneType falls back to special", () => {
  assert.equal(normalizeZoneType("hot"), "hot");
  assert.equal(normalizeZoneType("offer"), "offer");
  assert.equal(normalizeZoneType("bogus"), "special");
});

test("normalizeZone applies default color and label", () => {
  const z = normalizeZone({ type: "hot", x: 1, y: 1, widthMeters: 3, depthMeters: 2 });
  assert.equal(z.type, "hot");
  assert.equal(z.color, "#ef4444");
  assert.ok(z.id.startsWith("zone-"));
  assert.equal(z.name, "Hot zone");
});

test("zone containment uses rectangle footprint", () => {
  const inside = normalizeZone({ type: "offer", x: 2, y: 2, widthMeters: 3, depthMeters: 3 });
  const outside = normalizeZone({ type: "offer", x: 13, y: 11, widthMeters: 4, depthMeters: 4 });
  assert.ok(entityInsideLayout(inside, "zone", RECT));
  assert.ok(!entityInsideLayout(outside, "zone", RECT));
  const fp = zoneFootprint(inside);
  assert.equal(fp.w, 3);
  assert.equal(fp.d, 3);
});

test("entry point containment is a point-in-polygon test", () => {
  const entry = normalizeEntryPoint({ x: 0, y: 6, widthMeters: 1.8 });
  assert.ok(entityInsideLayout(entry, "entryPoint", RECT));
  assert.ok(!entityInsideLayout({ x: -1, y: 6 }, "entryPoint", RECT));
});

test("normalizeLayout defaults aisle orientation and keeps zones/entry", () => {
  const layout = normalizeLayout({
    ...RECT,
    aisles: [{ id: "a1", x: 1, y: 1, widthMeters: 1.2, lengthMeters: 6 }],
    zones: [{ type: "special", name: "Clearance", x: 1, y: 1, widthMeters: 2, depthMeters: 2 }],
    entryPoints: [{ x: 0, y: 6 }],
  });
  assert.equal(layout.aisles[0].orientation, "horizontal");
  assert.equal(layout.zones[0].type, "special");
  assert.equal(layout.zones[0].name, "Clearance");
  assert.equal(layout.entryPoints.length, 1);
});

test("saveLayout persists zones and entry points in payload", () => {
  resetDbForTests();
  const zone = normalizeZone({ id: "zone-offer-1", type: "offer", x: 2, y: 2, widthMeters: 3, depthMeters: 3 });
  const entry = normalizeEntryPoint({ id: "entry-1", x: 0, y: 6, widthMeters: 1.8 });
  const layout = normalizeLayout({
    id: "layout-zones-test",
    name: "Zone test",
    vertical: "retail",
    status: "draft",
    ...RECT,
    zones: [zone],
    entryPoints: [entry],
  });
  repo.saveLayout(layout);
  const loaded = repo.getLayout("layout-zones-test");
  assert.equal(loaded.zones.length, 1);
  assert.equal(loaded.zones[0].id, "zone-offer-1");
  assert.equal(loaded.zones[0].type, "offer");
  assert.equal(loaded.entryPoints.length, 1);
  assert.equal(loaded.entryPoints[0].id, "entry-1");
});
