import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { analyzePlanTextContent, floorPlanImportPayloadFromDraft } from "./floorPlanImport.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const layout2Text = fs.readFileSync(
  path.join(__dirname, "../../api/test/fixtures/layout2-text-extract.txt"),
  "utf8"
);
const newLayoutText = fs.readFileSync(
  path.join(__dirname, "../../api/test/fixtures/layout-newlayout-text-extract.txt"),
  "utf8"
);

describe("analyzePlanTextContent", () => {
  it("detects fixture runs and 9m/10m ambient from Layout2 extract", () => {
    const result = analyzePlanTextContent(layout2Text, { fileName: "Layout2.pdf" });
    expect(result.floorPlanImportMode).toBe("fixture");
    const lengths = result.fixturePlan.runs
      .filter((r) => r.kind === "ambient_gondola")
      .map((r) => r.lengthMeters)
      .sort((a, b) => a - b);
    expect(lengths).toEqual([9, 10]);
  });

  it("builds simplified retail layout from newLayout extract (24×14, geometry)", () => {
    const result = analyzePlanTextContent(newLayoutText, { fileName: "newLayout.txt" });
    expect(result.widthMeters).toBe(24);
    expect(result.depthMeters).toBe(14);
    expect(result.floorPlanImportMode).toBe("fixture");
    expect(result.fixturePlan.layoutTemplate).toBe("simplified_retail_v1");
    const geoRuns = result.fixturePlan.runs.filter((r) => r.geometry?.anchorX != null);
    expect(geoRuns.length).toBeGreaterThanOrEqual(10);
  });
});

describe("floorPlanImportPayloadFromDraft", () => {
  it("sends runs when fixture import mode selected", () => {
    const payload = floorPlanImportPayloadFromDraft({
      floorPlanFileName: "plan.pdf",
      floorPlanSourceFileName: "plan.pdf",
      floorPlanSourceType: "pdf",
      floorPlanImportMode: "fixture",
      fixturePlan: {
        importMode: "fixture",
        runs: [{ id: "run-1", kind: "ambient_gondola", lengthMeters: 9 }],
        aisleHints: [],
        warnings: [],
        parserVersion: "1.0.0",
        scale: { ratio: 50, method: "text_scale_notation", matched: "Scale 1:50" },
      },
    });
    expect(payload.importMode).toBe("fixture");
    expect(payload.runs).toHaveLength(1);
  });
});
