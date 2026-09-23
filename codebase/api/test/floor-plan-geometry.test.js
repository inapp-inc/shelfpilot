import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { associateLabelsToRuns } from "../../shared/floorPlanGeometry.mjs";
import { buildLayoutFromFixtureImport } from "../src/services/planFixtureImport.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test("associateLabelsToRuns maps PDF text position to layout metres", () => {
  const runs = [{ id: "run-1", label: "AMBIENT 9m", kind: "ambient_gondola", lengthMeters: 9, depthMeters: 0.6 }];
  const textItems = [{ str: "AMBIENT 9m", x: 200, y: 150 }];
  associateLabelsToRuns(runs, textItems, {
    pageWidth: 1000,
    pageHeight: 700,
    widthMeters: 40,
    depthMeters: 30,
  });
  assert.ok(runs[0].geometry);
  assert.ok(Math.abs(runs[0].geometry.centerXMeters - 8) < 1);
  assert.ok(Math.abs(runs[0].geometry.centerYMeters - 6.43) < 1.5);
});

test("buildLayoutFromFixtureImport uses geometry anchors when present", () => {
  const layout = {
    vertical: "hypermarket",
    widthMeters: 40,
    depthMeters: 30,
    heightMeters: 3.2,
    aisles: [],
    shelves: [],
  };
  buildLayoutFromFixtureImport(
    layout,
    {
      importMode: "fixture",
      runs: [
        {
          id: "run-a",
          label: "AMBIENT 9m",
          kind: "ambient_gondola",
          lengthMeters: 9,
          depthMeters: 0.6,
          geometry: { anchorX: 5, anchorY: 4, centerXMeters: 9.5, centerYMeters: 4.3 },
        },
      ],
    },
    {
      config: {
        fixtureTemplates: [{ type: "gondola", defaultLevels: 3 }],
      },
    }
  );
  assert.equal(layout.shelves[0].x, 5);
  assert.equal(layout.shelves[0].y, 4);
});

test("analyzePlanFromUploadBuffer parses layout2 text fixture", async () => {
  const text = fs.readFileSync(path.join(__dirname, "fixtures/layout2-text-extract.txt"), "utf8");
  const { analyzePlanFromUploadBuffer } = await import("../src/services/planAnalyzeFromUpload.js");
  const result = await analyzePlanFromUploadBuffer(Buffer.from(text, "utf8"), {
    fileName: "layout2-text-extract.txt",
    mimeType: "text/plain",
  });
  assert.ok(result.fixturePlan.runs.some((r) => r.lengthMeters === 9));
});
