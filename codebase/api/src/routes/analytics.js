import { Router } from "express";
import { repo, getConfig } from "../store/sqlite.js";
import { authRequired } from "../middleware/auth.js";
import { computeAnalytics, computePortfolioAnalytics } from "../services/layoutMath.js";
import {
  computePortfolioKpis,
} from "../services/analyticsReports.js";
import { listCategoriesForLayout } from "../services/categoryTree.js";
import {
  getCachedPortfolio,
  invalidatePortfolioAnalyticsCache,
  setCachedPortfolio,
} from "../services/portfolioAnalyticsCache.js";

export const analyticsRouter = Router();

function resolveLayoutOrSnapshot(layoutId, versionId) {
  if (versionId) {
    const ver = repo.getLayoutVersion(versionId);
    if (!ver) return null;
    return ver.snapshot;
  }
  return repo.getLayout(layoutId);
}

/** Backfill portfolioKpis for layouts saved before Phase 2 (one-time per layout). */
function ensurePortfolioKpis(records) {
  let backfilled = 0;
  for (const rec of records) {
    if (rec.portfolioKpis) continue;
    const layout = repo.getLayout(rec.id);
    if (!layout) continue;
    const categories = listCategoriesForLayout(layout.vertical, (v) => repo.listCategories(v));
    const config = getConfig(layout.vertical);
    rec.portfolioKpis = computePortfolioKpis(layout, categories, config);
    repo.patchPortfolioKpis(rec.id, rec.portfolioKpis);
    backfilled += 1;
  }
  if (backfilled > 0) {
    invalidatePortfolioAnalyticsCache();
    console.log(
      JSON.stringify({
        level: "info",
        message: "portfolio_kpis_backfill",
        count: backfilled,
      })
    );
  }
  return records;
}

analyticsRouter.get("/analytics/portfolio", authRequired, (req, res) => {
  const vertical = req.query.vertical || null;
  const cached = getCachedPortfolio(vertical);
  if (cached) {
    return res.json({ ...cached, cached: true });
  }

  const started = performance.now();
  let records = repo.listLayoutPortfolioSummaries();
  if (records.some((r) => !r.portfolioKpis)) {
    records = ensurePortfolioKpis(records);
  }
  const categories = repo.listCategories();
  const summary = computePortfolioAnalytics(records, categories, vertical);
  const durationMs = Number((performance.now() - started).toFixed(3));
  if (durationMs > 500) {
    console.log(
      JSON.stringify({
        level: "info",
        message: "analytics_portfolio",
        layoutCount: records.length,
        durationMs,
        backfill: records.filter((r) => r.portfolioKpis).length,
      })
    );
  }
  const payload = { ...summary, durationMs, cached: false };
  setCachedPortfolio(vertical, payload);
  res.json(payload);
});

analyticsRouter.get("/analytics/audit-summary", authRequired, (req, res) => {
  const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
  const entries = repo.listAudit(limit).filter((e) => String(e.action || "").startsWith("layout."));
  const byWeek = new Map();
  for (const e of entries) {
    const week = String(e.at || "").slice(0, 10);
    byWeek.set(week, (byWeek.get(week) || 0) + 1);
  }
  res.json({
    entries: entries.slice(0, limit),
    activityByDay: [...byWeek.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-14)
      .map(([day, count]) => ({ day, count })),
    total: entries.length,
  });
});

analyticsRouter.get("/analytics/layouts/:layoutId/summary", authRequired, (req, res) => {
  const layout = repo.getLayout(req.params.layoutId);
  if (!layout) return res.status(404).json({ error: "not_found" });
  const started = performance.now();
  const config = getConfig(layout.vertical);
  const summary = computeAnalytics(
    layout,
    (vertical) => repo.listCategories(vertical),
    config,
    () => repo.listProducts()
  );
  const durationMs = Number((performance.now() - started).toFixed(3));
  console.log(
    JSON.stringify({
      level: "info",
      message: "analytics_summary",
      layoutId: layout.id,
      durationMs,
    })
  );
  res.json({ ...summary, durationMs });
});

analyticsRouter.post("/analytics/compare", authRequired, (req, res) => {
  const { layoutIdA, layoutIdB, versionIdA, versionIdB } = req.body || {};
  const a = resolveLayoutOrSnapshot(layoutIdA, versionIdA);
  const b = resolveLayoutOrSnapshot(layoutIdB, versionIdB);
  if (!a || !b) return res.status(404).json({ error: "not_found" });
  const configA = getConfig(a.vertical);
  const configB = getConfig(b.vertical);
  const listCategories = (vertical) => repo.listCategories(vertical);
  const listProducts = () => repo.listProducts();
  const summaryA = computeAnalytics(a, listCategories, configA, listProducts);
  const summaryB = computeAnalytics(b, listCategories, configB, listProducts);
  res.json({
    utilizationDelta: Number((summaryB.utilizationPercent - summaryA.utilizationPercent).toFixed(1)),
    fixtureCountDelta: summaryB.fixtureCount - summaryA.fixtureCount,
    summaryA,
    summaryB,
  });
});
