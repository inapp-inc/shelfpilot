import assert from "node:assert/strict";
import test from "node:test";
import { packAislesAndShelves } from "../src/services/layoutPacker.js";
import {
  aisleFootprint,
  entityInsideLayout,
  zoneFootprint,
} from "../src/services/polygonContainment.js";
import { normalizeEntryPoint, normalizeZone, normalizeZoneType } from "../src/services/zones.js";
import { normalizeLayout } from "../src/services/layoutNormalize.js";

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

test("mixed orientation places both horizontal and vertical shelves", () => {
  const { shelves, aisles } = packAislesAndShelves(RECT, {
    orientation: "mixed",
    minAisleWidthMeters: 1.2,
    shelfTemplate: { type: "shelf", usableWidthMeters: 1.2, depthMeters: 0.6 },
  });
  const rots = new Set(shelves.map((s) => s.rotationDeg));
  assert.ok(rots.has(0), "expected some horizontal shelves (rot 0)");
  assert.ok(rots.has(90), "expected some vertical shelves (rot 90)");
  assert.ok(aisles.length >= 1);
  const orients = new Set(aisles.map((a) => a.orientation));
  assert.ok(orients.size >= 1);
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
  const { aisles, orientation } = packAislesAndShelves(tall, { minAisleWidthMeters: 1.2 });
  assert.equal(orientation, "vertical");
  for (const a of aisles) {
    assert.ok(entityInsideLayout(a, "aisle", tall), "vertical aisle should be inside polygon");
  }
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
