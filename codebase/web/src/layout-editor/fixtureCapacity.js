/**
 * Client-side fixture capacity from drawn fixture zone + Store Master templates.
 * Mirrors API computeAutoCalc (65% usable after aisles).
 */
import { formatAreaFromSqm, sqmToSqFt } from "../units.js";
import { layoutFixturePolygon } from "./polygonCanvas.js";

export function polygonAreaSqm(points) {
  if (!Array.isArray(points) || points.length < 3) return 0;
  let sum = 0;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    sum += Number(a.x) * Number(b.y) - Number(b.x) * Number(a.y);
  }
  return Math.abs(sum) / 2;
}

export function averageFixtureFootprintSqm(fixtureTypes) {
  const list = Array.isArray(fixtureTypes) ? fixtureTypes : [];
  if (!list.length) return 0.72;
  const sum = list.reduce(
    (s, t) => s + (Number(t.defaultWidthMeters) || 1) * (Number(t.defaultDepthMeters) || 0.6),
    0
  );
  return sum / list.length || 0.72;
}

/**
 * @returns {{
 *   hasDrawnArea: boolean,
 *   hasFixtures: boolean,
 *   areaSqm: number,
 *   areaSqFt: number,
 *   maxShelves: number | null,
 *   ready: boolean,
 *   areaLabel: string,
 * }}
 */
export function estimateFixtureCapacity(layout, fixtureTypes = []) {
  const poly = layoutFixturePolygon(layout);
  const hasDrawnArea = Boolean(poly);
  const hasFixtures = Array.isArray(fixtureTypes) && fixtureTypes.length > 0;
  const storeSqm = Number(layout?.widthMeters || 0) * Number(layout?.depthMeters || 0);
  const areaSqm = hasDrawnArea ? polygonAreaSqm(poly) : storeSqm;
  // Show capacity once templates exist and we have either a drawn zone or store L×W.
  const areaKnown = hasDrawnArea || storeSqm > 0;
  const avg = averageFixtureFootprintSqm(fixtureTypes);
  const usable = Math.max(0, areaSqm) * 0.65;
  const maxShelves =
    hasFixtures && areaKnown && avg > 0 ? Math.max(0, Math.floor(usable / avg)) : null;
  return {
    hasDrawnArea,
    hasFixtures,
    areaSqm: Number(areaSqm.toFixed(2)),
    areaSqFt: Math.round(sqmToSqFt(areaSqm)),
    maxShelves,
    // Header ready when fixtures configured and space known (drawn preferred).
    ready: hasFixtures && areaKnown,
    areaLabel: formatAreaFromSqm(areaSqm),
  };
}
