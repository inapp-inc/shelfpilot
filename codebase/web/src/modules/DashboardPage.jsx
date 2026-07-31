import { useEffect, useMemo, useState } from "react";
import { VERTICALS } from "../referenceCatalog.js";
import { storeTypeForVertical } from "../storeTypes.js";
import AnalyticsWidgetBoard from "./AnalyticsWidgetBoard.jsx";
import {
  DASHBOARD_DEFAULT_VISIBLE_WIDGET_IDS,
  DASHBOARD_EXCLUDED_WIDGET_IDS,
  DASHBOARD_WIDGETS_STORAGE_KEY,
} from "./analyticsWidgets.js";

const STATUS_LABELS = {
  draft: "Draft",
  in_review: "In review",
  approved: "Approved",
  rejected: "Rejected",
};

const STATUS_COLORS = {
  draft: "#64748b",
  in_review: "#d97706",
  approved: "#16a34a",
  rejected: "#dc2626",
};

export default function DashboardPage({
  layouts,
  token,
  onOpenLayout,
  onNavigateLayouts,
  onNavigateAnalytics,
  onNewLayout,
  role,
}) {
  const sorted = useMemo(
    () => [...layouts].sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""))),
    [layouts]
  );

  const statusCounts = useMemo(() => {
    const counts = { draft: 0, in_review: 0, approved: 0, rejected: 0 };
    for (const l of layouts) {
      const s = l.status || "draft";
      if (counts[s] != null) counts[s] += 1;
    }
    return counts;
  }, [layouts]);

  const featured = sorted[0] || null;
  const [analyticsLayoutId, setAnalyticsLayoutId] = useState("");

  useEffect(() => {
    if (!analyticsLayoutId && sorted.length) setAnalyticsLayoutId(sorted[0].id);
  }, [sorted, analyticsLayoutId]);

  const analyticsLayout = sorted.find((l) => l.id === analyticsLayoutId);

  return (
    <section className="fade module-page dashboard-page">
      <div className="module-header dashboard-header">
        <div>
          <h2 className="page-title">
            <span className="module-emoji">📊</span> Dashboard
          </h2>
          <p className="muted dashboard-subtitle">Portfolio overview and layout analytics at a glance</p>
        </div>
        {onNewLayout ? (
          <button type="button" className="btn-primary dashboard-new-btn" onClick={onNewLayout}>
            + New layout
          </button>
        ) : null}
      </div>

      <div className="dashboard-pipeline panel">
        {Object.entries(statusCounts).map(([status, count]) => (
          <button
            key={status}
            type="button"
            className="dashboard-pipeline-seg"
            disabled={!onNavigateLayouts}
            onClick={() => onNavigateLayouts?.(status)}
          >
            <div className="dashboard-pipeline-label">{STATUS_LABELS[status]}</div>
            <div className="dashboard-pipeline-count" style={{ color: STATUS_COLORS[status] }}>
              {count}
            </div>
          </button>
        ))}
      </div>

      <div className="dashboard-hero-grid">
        <div className="panel dashboard-featured">
          <div className="section-label">Featured layout</div>
          {featured ? (
            <>
              <div className="dashboard-featured-name">{featured.name}</div>
              <div className="dashboard-featured-meta">
                <span
                  className="dashboard-status-badge"
                  style={{
                    background: `${STATUS_COLORS[featured.status || "draft"]}22`,
                    color: STATUS_COLORS[featured.status || "draft"],
                  }}
                >
                  {STATUS_LABELS[featured.status || "draft"]}
                </span>
                <span className="muted">
                  {storeTypeForVertical(featured.vertical)?.label || (VERTICALS[featured.vertical] || VERTICALS.retail).label}
                </span>
              </div>
              <div className="muted dashboard-featured-dims">
                {featured.widthMeters}×{featured.depthMeters} m · Updated {featured.updatedAt?.slice(0, 10) || "—"}
              </div>
              <button type="button" className="btn-primary dashboard-open-btn" onClick={() => onOpenLayout(featured)}>
                Open in editor →
              </button>
            </>
          ) : (
            <div className="muted">No layouts yet. Create one to get started.</div>
          )}
        </div>

        <div className="panel dashboard-actions">
          <div className="section-label">Quick actions</div>
          <div className="dashboard-action-list">
            {onNewLayout ? (
              <button type="button" className="btn-secondary" onClick={onNewLayout}>
                + New layout
              </button>
            ) : null}
            {featured ? (
              <button type="button" className="btn-secondary" onClick={() => onOpenLayout(featured)}>
                Open last edited
              </button>
            ) : null}
            {(role === "Approver" || role === "Admin") && statusCounts.in_review > 0 && onNavigateLayouts ? (
              <button type="button" className="btn-secondary" onClick={() => onNavigateLayouts("in_review")}>
                Pending approvals ({statusCounts.in_review})
              </button>
            ) : null}
            {onNavigateLayouts ? (
              <button type="button" className="btn-secondary" onClick={() => onNavigateLayouts("all")}>
                Browse all layouts →
              </button>
            ) : null}
            {onNavigateAnalytics ? (
              <button type="button" className="btn-secondary" onClick={onNavigateAnalytics}>
                Full analytics module →
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <section className="dashboard-analytics-section">
        <div className="dashboard-analytics-head">
          <div>
            <div className="section-label dashboard-analytics-title">Layout analytics</div>
            <p className="muted dashboard-analytics-desc">
              Space utilization and key metrics for {analyticsLayout?.name || "selected layout"}.
            </p>
          </div>
        </div>

        {!sorted.length ? (
          <div className="empty-box">Create a layout to see analytics on your dashboard.</div>
        ) : (
          <AnalyticsWidgetBoard
            layouts={layouts}
            token={token}
            storageKey={DASHBOARD_WIDGETS_STORAGE_KEY}
            defaultVisibleIds={DASHBOARD_DEFAULT_VISIBLE_WIDGET_IDS}
            layoutId={analyticsLayoutId}
            onLayoutIdChange={setAnalyticsLayoutId}
            showLayoutPicker
            showCustomize
            customizeTitle="Customize dashboard widgets"
            kpiSectionLabel="Key metrics"
            emptyMessage="Select a layout to view analytics."
            className="dashboard-analytics-board"
            excludeWidgetIds={DASHBOARD_EXCLUDED_WIDGET_IDS}
            pinFeaturedWidgets
          />
        )}
      </section>
    </section>
  );
}
