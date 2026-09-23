/**
 * Shared floor-plan text analyze — dimensions + fixture runs + simplified layout geometry.
 * Used by web upload, API analyze-plan, and tests.
 */
import { mergeDimensionCandidates, parseStoreDimensionsFromFileName, parseStoreDimensionsFromText } from "./floorPlanDimensions.mjs";
import {
  deriveStoreEnvelopeFromRuns,
  mergeFixtureParse,
  parseDrawingScaleFromText,
  parseFixtureRunsFromText,
} from "./floorPlanFixtures.mjs";
import { parseScaleBarFromText } from "./floorPlanGeometry.mjs";
import { enrichSimplifiedPlanImport } from "./floorPlanSimplifiedLayout.mjs";

export const DEFAULT_PLAN_LONG_EDGE_M = 24;

export function dimensionsFromAspect(aspect, longEdgeM = DEFAULT_PLAN_LONG_EDGE_M) {
  const longEdge = longEdgeM;
  if (!aspect || !Number.isFinite(aspect) || aspect <= 0) {
    return { widthMeters: longEdge, depthMeters: Math.round((longEdge * 2) / 3 * 10) / 10 };
  }
  if (aspect >= 1) {
    return {
      widthMeters: longEdge,
      depthMeters: Math.max(1, Math.round((longEdge / aspect) * 10) / 10),
    };
  }
  return {
    widthMeters: Math.max(1, Math.round(longEdge * aspect * 10) / 10),
    depthMeters: longEdge,
  };
}

/** Prefer fixture import when runs include placement geometry (simplified plan template). */
export function resolveFloorPlanImportMode(fixturePlan) {
  const runs = fixturePlan?.runs || [];
  if (runs.length >= 3 && runs.some((r) => r.geometry?.anchorX != null || r.geometry?.centerXMeters != null)) {
    return "fixture";
  }
  return fixturePlan?.importMode === "fixture" && runs.length > 0 ? "fixture" : "envelope";
}

/**
 * @returns {{
 *   fixturePlan: object,
 *   widthMeters: number,
 *   depthMeters: number,
 *   floorPlanImportMode: string,
 *   dimensionSource: string,
 *   matchedText: string|null,
 *   floorPlanEnvelopeDerived: boolean,
 *   scaleParse: object,
 * }}
 */
export function analyzePlanTextContent(textContent, { fileName = "plan.pdf", aspect = null } = {}) {
  const text = String(textContent || "");
  const fromText = parseStoreDimensionsFromText(text);
  const fromName = parseStoreDimensionsFromFileName(fileName);
  const parsed = mergeDimensionCandidates(fromText, fromName);

  const scaleParse = parseDrawingScaleFromText(text);
  const scaleBar = parseScaleBarFromText(text);
  const fixtureParse = parseFixtureRunsFromText(text);
  let fixturePlan = mergeFixtureParse(scaleParse, fixtureParse);
  if (scaleBar.barSpanMeters) {
    fixturePlan.scale = { ...fixturePlan.scale, scaleBarMeters: scaleBar.barSpanMeters };
  }

  const aspectDims = dimensionsFromAspect(aspect);
  let widthMeters = parsed.widthMeters ?? aspectDims.widthMeters;
  let depthMeters = parsed.depthMeters ?? aspectDims.depthMeters;
  let dimensionSource = parsed.source !== "none" ? parsed.source : aspect ? "aspect" : "manual";
  let matchedText = parsed.matched || null;
  let floorPlanEnvelopeDerived = false;

  if (fixturePlan.runs.length > 0 && parsed.source === "none") {
    const derived = deriveStoreEnvelopeFromRuns(fixturePlan.runs, fixturePlan.aisleHints);
    widthMeters = derived.widthMeters;
    depthMeters = derived.depthMeters;
    dimensionSource = "scale";
    matchedText = matchedText || scaleParse.matched;
    floorPlanEnvelopeDerived = true;
  }

  if (parsed.widthMeters && parsed.depthMeters) {
    floorPlanEnvelopeDerived = false;
  }

  enrichSimplifiedPlanImport(text, fixturePlan, widthMeters, depthMeters);

  return {
    fixturePlan,
    widthMeters,
    depthMeters,
    floorPlanImportMode: resolveFloorPlanImportMode(fixturePlan),
    dimensionSource,
    matchedText,
    floorPlanEnvelopeDerived,
    scaleParse,
  };
}
