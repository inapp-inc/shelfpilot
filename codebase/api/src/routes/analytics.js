import { Router } from "express";
import { repo, getConfig } from "../store/sqlite.js";
import { authRequired } from "../middleware/auth.js";
import { computeAnalytics, computePortfolioAnalytics } from "../services/layoutMath.js";

export const analyticsRouter = Router();

function resolveLayoutOrSnapshot(layoutId, versionId) {
  if (versionId) {
    const ver = repo.getLayoutVersion(versionId);
    if (!ver) return null;
    return ver.snapshot;
  }
  return repo.getLayout(layoutId);
}

analyticsRouter.get("/analytics/portfolio", authRequired, (req, res) => {
  const vertical = req.query.vertical || null;
  const summaries = repo.listLayouts();
  const layouts = summaries.map((l) => repo.getLayout(l.id)).filter(Boolean);
  const categories = repo.listCategories();
  const summary = computePortfolioAnalytics(layouts, categories, vertical);
  res.json(summary);
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
