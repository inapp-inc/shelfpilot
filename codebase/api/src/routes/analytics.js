import { Router } from "express";
import { repo } from "../store/sqlite.js";
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

analyticsRouter.get("/analytics/layouts/:layoutId/summary", authRequired, (req, res) => {
  const layout = repo.getLayout(req.params.layoutId);
  if (!layout) return res.status(404).json({ error: "not_found" });
  const started = performance.now();
  const summary = computeAnalytics(layout, repo.listCategories());
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
  const cats = repo.listCategories();
  const summaryA = computeAnalytics(a, cats);
  const summaryB = computeAnalytics(b, cats);
  res.json({
    utilizationDelta: Number((summaryB.utilizationPercent - summaryA.utilizationPercent).toFixed(1)),
    fixtureCountDelta: summaryB.fixtureCount - summaryA.fixtureCount,
    summaryA,
    summaryB,
  });
});
