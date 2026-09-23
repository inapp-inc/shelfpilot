import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseStoreDimensionsFromText } from "../../shared/floorPlanDimensions.mjs";
import { parseFixtureRunsFromText, mergeFixtureParse, parseDrawingScaleFromText } from "../../shared/floorPlanFixtures.mjs";
import { enrichSimplifiedPlanImport } from "../../shared/floorPlanSimplifiedLayout.mjs";
import { buildLayoutFromFixtureImport } from "../src/services/planFixtureImport.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const newLayoutText = fs.readFileSync(
  path.join(__dirname, "fixtures/layout-newlayout-text-extract.txt"),
  "utf8"
);

test("newLayout extract parses 24 x 14 store envelope", () => {
  const dims = parseStoreDimensionsFromText(newLayoutText);
  assert.equal(dims.widthMeters, 24);
  assert.equal(dims.depthMeters, 14);
});

test("newLayout extract expands refrigeration, ambient, and four gondolas", () => {
  const { runs } = parseFixtureRunsFromText(newLayoutText);
  assert.equal(runs.filter((r) => r.kind === "chiller").length, 1);
  assert.equal(runs.filter((r) => r.kind === "freezer").length, 5);
  const ambient = runs.find((r) => r.kind === "ambient_gondola" && r.lengthMeters === 12);
  assert.ok(ambient);
  assert.equal(runs.filter((r) => r.kind === "gondola").length, 4);
});

test("newLayout import builds shelves matching simplified plan geometry", () => {
  const scale = parseDrawingScaleFromText(newLayoutText);
  const fixture = parseFixtureRunsFromText(newLayoutText);
  const plan = mergeFixtureParse(scale, fixture);
  enrichSimplifiedPlanImport(newLayoutText, plan, 24, 14);

  const layout = {
    name: "New layout import",
    vertical: "hypermarket",
    widthMeters: 24,
    depthMeters: 14,
    heightMeters: 3.2,
    aisles: [],
    shelves: [],
  };

  const result = buildLayoutFromFixtureImport(
    layout,
    {
      importMode: "fixture",
      runs: plan.runs,
      aisleHints: plan.aisleHints,
      warnings: plan.warnings,
      planText: newLayoutText,
    },
    {
      config: {
        minAisleWidthMeters: 1.2,
        fixtureTemplates: [
          { type: "gondola", defaultDepthMeters: 0.9, defaultLevels: 3 },
          { type: "chilled", defaultDepthMeters: 0.9, defaultLevels: 3 },
          { type: "frozen", defaultDepthMeters: 0.9, defaultLevels: 3 },
        ],
      },
    }
  );

  assert.ok(result.shelfCount >= 11);
  const chilled = layout.shelves.filter((s) => s.type === "chilled");
  const frozen = layout.shelves.filter((s) => s.type === "frozen");
  const gondola = layout.shelves.filter((s) => s.type === "gondola");
  assert.equal(chilled.length, 1);
  assert.equal(frozen.length, 5);
  assert.equal(gondola.length, 5);
  assert.equal(chilled[0].y, frozen[0].y);
  const southAmbient = layout.shelves.find((s) => s.usableWidthMeters === 12);
  assert.ok(southAmbient);
  assert.ok(southAmbient.y > chilled[0].y);
  assert.ok(layout.obstacles?.length >= 2);
});
