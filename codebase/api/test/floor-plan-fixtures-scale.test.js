import test from "node:test";
import assert from "node:assert/strict";
import {
  PARSER_VERSION,
  parseDrawingScaleFromText,
  parseMillimetreDimensions,
  parseAisleWidthHints,
  realMetersPerDrawingMillimetre,
} from "../../shared/floorPlanFixtures.mjs";

test("PARSER_VERSION is semver-shaped", () => {
  assert.match(PARSER_VERSION, /^\d+\.\d+\.\d+$/);
});

test("parseDrawingScaleFromText reads Layout2-style Scale 1:50", () => {
  const text = "PROPOSED GROUND FLOOR PLAN\nScale 1:50\nAMBIENT 9m";
  const parsed = parseDrawingScaleFromText(text);
  assert.equal(parsed.ratio, 50);
  assert.equal(parsed.method, "text_scale_notation");
  assert.match(parsed.matched || "", /1:50/i);
});

test("parseDrawingScaleFromText accepts spaced colon", () => {
  const parsed = parseDrawingScaleFromText("Drawing scale 1 : 100");
  assert.equal(parsed.ratio, 100);
});

test("realMetersPerDrawingMillimetre at 1:50", () => {
  assert.equal(realMetersPerDrawingMillimetre(50), 0.05);
});

test("parseAisleWidthHints finds 1500 and 1250 mm with aisle context", () => {
  const text = `
    Gondola run
    Aisle clearance 1500 between runs
    Secondary passage min width 1250 mm
  `;
  const hints = parseAisleWidthHints(text);
  const widths = hints.map((h) => h.widthMeters).sort((a, b) => a - b);
  assert.ok(widths.includes(1.25), `expected 1.25 in ${widths}`);
  assert.ok(widths.includes(1.5), `expected 1.5 in ${widths}`);
});

test("parseAisleWidthHints ignores bare grid numbers without aisle context", () => {
  const text = "Grid reference 3125 3750 KALEA CHILLED 3750 model code 11350";
  const hints = parseAisleWidthHints(text);
  assert.equal(hints.length, 0);
});

test("parseMillimetreDimensions collects explicit mm labels", () => {
  const dims = parseMillimetreDimensions("depth 250mm shelf side 1500mm");
  const values = dims.map((d) => d.valueMeters);
  assert.ok(values.includes(0.25));
  assert.ok(values.includes(1.5));
});

test("parseDrawingScaleFromText returns none for empty input", () => {
  assert.deepEqual(parseDrawingScaleFromText(""), {
    ratio: null,
    method: "none",
    matched: null,
  });
});
