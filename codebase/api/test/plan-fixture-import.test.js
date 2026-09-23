import test from "node:test";
import assert from "node:assert/strict";
import {
  buildLayoutFromFixtureImport,
  deriveStoreEnvelopeFromRuns,
} from "../src/services/planFixtureImport.js";
import { validateFixtureImportPayload } from "../src/services/planFixtureImportSchema.js";

test("deriveStoreEnvelopeFromRuns covers total run length plus margin", () => {
  const runs = [
    { lengthMeters: 9, depthMeters: 0.6 },
    { lengthMeters: 10, depthMeters: 0.6 },
  ];
  const env = deriveStoreEnvelopeFromRuns(runs, [{ widthMeters: 1.5 }]);
  assert.ok(env.widthMeters >= 9 + 10);
  assert.ok(env.depthMeters >= 5);
});

test("buildLayoutFromFixtureImport creates two ambient shelves with correct widths", () => {
  const layout = {
    name: "Import test",
    vertical: "hypermarket",
    widthMeters: 40,
    depthMeters: 30,
    heightMeters: 3.2,
    aisles: [],
    shelves: [],
  };
  const result = buildLayoutFromFixtureImport(
    layout,
    {
      importMode: "fixture",
      runs: [
        { id: "run-a", label: "AMBIENT 9m", kind: "ambient_gondola", lengthMeters: 9, depthMeters: 0.6 },
        { id: "run-b", label: "AMBIENT 10m", kind: "ambient_gondola", lengthMeters: 10, depthMeters: 0.6 },
      ],
      aisleHints: [{ widthMeters: 1.5, source: "1500 mm" }],
      warnings: [],
    },
    {
      config: {
        minAisleWidthMeters: 1.2,
        fixtureTemplates: [{ type: "gondola", defaultDepthMeters: 0.9, defaultLevels: 3 }],
      },
    }
  );
  assert.equal(result.shelfCount, 2);
  assert.ok(result.aisleCount >= 1);
  const widths = layout.shelves.map((s) => s.usableWidthMeters).sort((a, b) => a - b);
  assert.deepEqual(widths, [9, 10]);
});

test("chiller run maps to chilled fixture type when template allows", () => {
  const layout = {
    vertical: "hypermarket",
    widthMeters: 30,
    depthMeters: 20,
    heightMeters: 3.2,
    aisles: [],
    shelves: [],
  };
  buildLayoutFromFixtureImport(
    layout,
    {
      importMode: "fixture",
      runs: [{ id: "run-c", label: "KALEA CHILLED", kind: "chiller", lengthMeters: 3.75, depthMeters: 0.9 }],
    },
    {
      config: {
        fixtureTemplates: [
          { type: "gondola", defaultLevels: 3 },
          { type: "chilled", defaultLevels: 3, defaultDepthMeters: 0.9 },
        ],
      },
    }
  );
  assert.equal(layout.shelves[0].type, "chilled");
  assert.equal(layout.shelves[0].temperatureZone, "chilled");
});

test("validateFixtureImportPayload rejects negative run length", () => {
  const check = validateFixtureImportPayload({
    importMode: "fixture",
    runs: [{ kind: "ambient_gondola", lengthMeters: -2 }],
  });
  assert.equal(check.ok, false);
  assert.equal(check.error, "invalid_run_length");
});
