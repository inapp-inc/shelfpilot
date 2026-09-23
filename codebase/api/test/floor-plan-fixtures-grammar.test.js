import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  mergeFixtureParse,
  parseDrawingScaleFromText,
  parseFixtureRunsFromText,
} from "../../shared/floorPlanFixtures.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixtureDir = path.join(__dirname, "fixtures");

function readFixture(name) {
  return fs.readFileSync(path.join(fixtureDir, name), "utf8");
}

test("layout2 extract contains ambient runs 9m and 10m", () => {
  const text = readFixture("layout2-text-extract.txt");
  const { runs } = parseFixtureRunsFromText(text);
  const ambientLengths = runs
    .filter((r) => r.kind === "ambient_gondola")
    .map((r) => r.lengthMeters)
    .sort((a, b) => a - b);
  assert.deepEqual(ambientLengths, [9, 10]);
});

test("4 BAYS 5 SHELVES attaches bayCount and levelCount to ambient run", () => {
  const text = readFixture("layout2-text-extract.txt");
  const { runs } = parseFixtureRunsFromText(text);
  const nineM = runs.find((r) => r.lengthMeters === 9);
  assert.ok(nineM);
  assert.equal(nineM.bayCount, 4);
  assert.equal(nineM.levelCount, 5);
});

test("layout1 extract parses refrigeration and veg ambient", () => {
  const text = readFixture("layout1-text-extract.txt");
  const { runs } = parseFixtureRunsFromText(text);
  assert.ok(runs.some((r) => r.kind === "freezer"));
  assert.ok(runs.some((r) => r.kind === "chiller"));
  assert.ok(runs.some((r) => r.suggestedCategoryName === "Produce"));
  assert.ok(runs.some((r) => r.kind === "low_level" && r.lengthMeters === 11));
});

test("6 DOORS 3 BAYS attaches to nearest preceding KALEA run", () => {
  const text = readFixture("layout1-text-extract.txt");
  const { runs } = parseFixtureRunsFromText(text);
  const freezer = runs.find((r) => r.kind === "freezer");
  const chiller = runs.find((r) => r.kind === "chiller");
  assert.ok(freezer);
  assert.ok(chiller);
  assert.equal(freezer.doorCount, 6);
  assert.equal(freezer.bayCount, 3);
  assert.equal(chiller.doorCount, 6);
  assert.equal(chiller.bayCount, 3);
});

test("handwritten-only noise does not create fixture runs", () => {
  const { runs, warnings } = parseFixtureRunsFromText("TILL 5x handwritten markup only");
  assert.equal(runs.length, 0);
  assert.ok(warnings.includes("checkout_area_not_imported"));
});

test("mergeFixtureParse sets importMode fixture when runs present", () => {
  const scale = parseDrawingScaleFromText("Scale 1:50");
  const fixture = parseFixtureRunsFromText("AMBIENT 9m");
  const merged = mergeFixtureParse(scale, fixture);
  assert.equal(merged.importMode, "fixture");
  assert.equal(merged.scale.ratio, 50);
  assert.equal(merged.runs.length, 1);
});
