/** Auto-calc optimal fixture count from footprint and vertical template density. */

import { buildLayoutAnalyticsReport, buildPortfolioAnalyticsReport } from "./analyticsReports.js";

export function computeAutoCalc(layout, config) {
  const started = performance.now();
  const footprintSqm = Number(layout.widthMeters) * Number(layout.depthMeters);
  const avgFixtureArea =
    (config?.fixtureTemplates || []).reduce((sum, t) => sum + (t.defaultWidthMeters || 1) * (t.defaultDepthMeters || 0.6), 0) /
      Math.max((config?.fixtureTemplates || []).length, 1) || 0.72;
  // Leave ~35% for aisles/circulation
  const usable = footprintSqm * 0.65;
  const maxFixtures = Math.max(0, Math.floor(usable / avgFixtureArea));
  const ms = performance.now() - started;
  console.log(
    JSON.stringify({
      level: "info",
      message: "auto_calc",
      layoutId: layout.id,
      durationMs: Number(ms.toFixed(3)),
      maxFixtures,
      footprintSqm,
    })
  );
  return {
    maxFixtures,
    footprintSqm: Number(footprintSqm.toFixed(2)),
    calculatedAt: new Date().toISOString(),
  };
}

export function validateAisles(layout, config) {
  const min = Number(config?.minAisleWidthMeters ?? 1.2);
  const violations = [];
  for (const aisle of layout.aisles || []) {
    if (Number(aisle.widthMeters) < min) {
      const msg = `Aisle ${aisle.name || aisle.id} width ${aisle.widthMeters}m < min ${min}m`;
      aisle.violations = [msg];
      violations.push(msg);
    } else {
      aisle.violations = [];
    }
  }
  return violations;
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
