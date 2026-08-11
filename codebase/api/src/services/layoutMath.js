/** Auto-calc optimal fixture count from footprint and vertical template density. */

import { buildLayoutAnalyticsReport, buildPortfolioAnalyticsReport, polygonArea } from "./analyticsReports.js";
import { totalObstacleAreaSqm } from "./obstacles.js";

export function computeAutoCalc(layout, config) {
  const started = performance.now();
  // Prefer drawn fixture-zone polygon; fall back to store L×W rectangle.
  const polySqm = polygonArea(layout?.polygon);
  const footprintSqm =
    polySqm > 0 ? polySqm : Number(layout.widthMeters) * Number(layout.depthMeters);
  const templates = config?.fixtureTemplates || [];
  const avgFixtureArea =
    templates.reduce((sum, t) => sum + (t.defaultWidthMeters || 1) * (t.defaultDepthMeters || 0.6), 0) /
      Math.max(templates.length, 1) || 0.72;
  // Columns and blocked areas are not plannable floor.
  const plannableSqm = Math.max(0, footprintSqm - totalObstacleAreaSqm(layout));
  // Leave ~35% for aisles/circulation
  const usable = plannableSqm * 0.65;
  const maxFixtures = templates.length ? Math.max(0, Math.floor(usable / avgFixtureArea)) : 0;
  const ms = performance.now();
  console.log(
    JSON.stringify({
      level: "info",
      message: "auto_calc",
      layoutId: layout.id,
      durationMs: Number((ms - started).toFixed(3)),
      maxFixtures,
      footprintSqm,
      hasPolygon: polySqm > 0,
      fixtureTemplateCount: templates.length,
    })
  );
  return {
    maxFixtures,
    footprintSqm: Number(footprintSqm.toFixed(2)),
    avgFixtureAreaSqm: Number(avgFixtureArea.toFixed(4)),
    hasDrawnArea: polySqm > 0,
    fixtureTemplateCount: templates.length,
    calculatedAt: new Date().toISOString(),
  };
}

export function validateAisles(layout, config) {
  const min = Number(config?.minAisleWidthMeters ?? 1.2);
  const narrow = [];
  for (const aisle of layout.aisles || []) {
    if (Number(aisle.widthMeters) < min) {
      narrow.push(aisle);
      aisle.violations = [
        `Aisle ${aisle.name || aisle.id} width ${aisle.widthMeters}m < min ${min}m`,
      ];
    } else {
      aisle.violations = [];
    }
  }
  if (!narrow.length) return [];
  if (narrow.length === 1) {
    const a = narrow[0];
    return [`Aisle ${a.name || a.id} width ${a.widthMeters}m < min ${min}m`];
  }
  const example = narrow[0];
  return [
    `${narrow.length} walk aisles below minimum ${min}m (e.g. ${example.name || example.id}: ${example.widthMeters}m)`,
  ];
}

export function computeAnalytics(layout, categories, config = null, listProducts = null) {
  return buildLayoutAnalyticsReport(layout, categories, config || {}, listProducts);
}

export function computePortfolioAnalytics(layouts, categories, verticalFilter) {
  const list = typeof categories === "function" ? [] : categories || [];
  const report = buildPortfolioAnalyticsReport(layouts, list, verticalFilter);
  // Legacy fields for backward compatibility
  return {
    layoutCount: report.layoutCount,
    totalShelves: report.storeBenchmarking?.rows?.reduce((s, r) => s + r.fixtureCount, 0) ?? 0,
    mappedCategoryCount: 0,
    avgUtilizationPercent: report.avgUtilizationPercent,
    allocationByCategory: [],
    ...report,
  };
}
