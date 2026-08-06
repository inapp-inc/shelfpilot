import { useCallback, useEffect, useMemo, useState } from "react";
import AnalyticsWidgetBoard from "./AnalyticsWidgetBoard.jsx";
import {
  ANALYTICS_SECTIONS,
  ANALYTICS_WIDGETS_STORAGE_KEY,
  DEFAULT_VISIBLE_WIDGET_IDS,
} from "./analyticsWidgets.js";
import { canEditLayouts, canUseDashboardDrillDown, canViewAuditLog } from "../rolePermissions.js";

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
  toast,
  onNavigateLayouts,
  onNavigateAdmin,
  onOpenLayout,
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

  const [analyticsLayoutId, setAnalyticsLayoutId] = useState("");
  const [section, setSection] = useState("all");
  const [viewTab, setViewTab] = useState("reports");

  const canEditLayout = canEditLayouts(role);

  useEffect(() => {
    if (!analyticsLayoutId && sorted.length) setAnalyticsLayoutId(sorted[0].id);
  }, [sorted, analyticsLayoutId]);

  const handleDrillDown = useCallback(
    (drill) => {
      if (!canUseDashboardDrillDown(role) || !drill?.action) return;

      switch (drill.action) {
        case "tab":
          setViewTab(drill.tab || "reports");
          break;
        case "section":
          setViewTab("reports");
          if (drill.section) setSection(drill.section);
          break;
        case "layouts":
          onNavigateLayouts?.(drill.status && drill.status !== "all" ? drill.status : "all");
          break;
        case "layout-editor": {
          const layout = sorted.find((l) => l.id === analyticsLayoutId) || sorted[0];
          if (layout) onOpenLayout?.(layout);
          break;
        }
        case "admin":
          if (canViewAuditLog(role)) onNavigateAdmin?.(drill.adminTab || "audit");
          break;
        default:
          break;
      }
    },
    [role, sorted, analyticsLayoutId, onNavigateLayouts, onOpenLayout, onNavigateAdmin]
  );

  const toolbarContent = (
    <div className="dashboard-toolbar-stack">
      <div className="dashboard-view-tabs" role="tablist" aria-label="Dashboard views">
        <button
          type="button"
          role="tab"
          aria-selected={viewTab === "reports"}
          className={`dashboard-view-tab${viewTab === "reports" ? " dashboard-view-tab--active" : ""}`}
          onClick={() => setViewTab("reports")}
        >
          Reports
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={viewTab === "product-mapping"}
          className={`dashboard-view-tab${viewTab === "product-mapping" ? " dashboard-view-tab--active" : ""}`}
          onClick={() => setViewTab("product-mapping")}
        >
          Product mapping
        </button>
      </div>
      {viewTab === "reports" ? (
        <div className="analytics-section-filters analytics-section-filters--toolbar" role="tablist" aria-label="Report sections">
          {ANALYTICS_SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              role="tab"
              aria-selected={section === s.id}
              className={`analytics-section-chip${section === s.id ? " analytics-section-chip--active" : ""}`}
              onClick={() => setSection(s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );

  return (
    <section className="fade module-page dashboard-page" data-testid="dashboard-page">
      <div className="module-header dashboard-header dashboard-header--compact">
        <div>
          <h2 className="page-title">
            <span className="module-emoji">📊</span> Dashboard
          </h2>
        </div>
        {onNewLayout ? (
          <button
            type="button"
            className="btn-primary dashboard-new-btn"
            data-testid="dashboard-new-layout"
            onClick={onNewLayout}
          >
            + New layout
          </button>
        ) : null}
      </div>

      <div className="dashboard-pipeline panel" data-testid="dashboard-pipeline">
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
        {(role === "Approver" || role === "Admin") && statusCounts.in_review > 0 && onNavigateLayouts ? (
          <button type="button" className="dashboard-pipeline-action" onClick={() => onNavigateLayouts("in_review")}>
            Review ({statusCounts.in_review})
          </button>
        ) : null}
      </div>

      <section className="dashboard-analytics-section" data-testid="dashboard-analytics">
        {!sorted.length ? (
          <div className="empty-box" data-testid="dashboard-analytics-empty">Create a layout to see analytics on your dashboard.</div>
        ) : (
          <AnalyticsWidgetBoard
            layouts={layouts}
            token={token}
            toast={toast}
            storageKey={ANALYTICS_WIDGETS_STORAGE_KEY}
            defaultVisibleIds={DEFAULT_VISIBLE_WIDGET_IDS}
            sectionFilter={section}
            dashboardTab={viewTab}
            layoutId={analyticsLayoutId}
            onLayoutIdChange={setAnalyticsLayoutId}
            showLayoutPicker
            showCustomize
            customizeTitle="Customize analytics dashboard"
            emptyMessage="Select a layout to view reports."
            className="dashboard-analytics-board"
            pinFeaturedWidgets
            enableReorder
            toolbarExtra={toolbarContent}
            role={role}
            onDrillDown={handleDrillDown}
            canEditLayout={canEditLayout}
          />
        )}
      </section>
    </section>
  );
}
