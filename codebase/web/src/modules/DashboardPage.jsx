import { useEffect, useMemo, useState } from "react";
import { VERTICALS } from "../referenceCatalog.js";
import { storeTypeForVertical } from "../storeTypes.js";
import { api } from "../api.js";
import DonutChart from "./charts/DonutChart.jsx";
import BarChart from "./charts/BarChart.jsx";
import MissingProductsPanel from "../layout-editor/MissingProductsPanel.jsx";

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

export default function DashboardPage({ layouts, token, onOpenLayout, onNavigateLayouts, onNewLayout, role }) {
  const sorted = useMemo(
    () =>
      [...layouts].sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""))),
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

  const [selectedId, setSelectedId] = useState("");
  const [summary, setSummary] = useState(null);
  const [coverage, setCoverage] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [coverageLoading, setCoverageLoading] = useState(false);

  useEffect(() => {
    if (!selectedId && sorted.length) setSelectedId(sorted[0].id);
  }, [sorted, selectedId]);

  const selectedLayout = sorted.find((l) => l.id === selectedId);

  useEffect(() => {
    if (!selectedId || !token) return;
    let cancelled = false;
    setLoading(true);
    api(`/analytics/layouts/${selectedId}/summary`, { token })
      .then((s) => !cancelled && setSummary(s))
      .catch(() => !cancelled && setSummary(null))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [selectedId, token]);

  useEffect(() => {
    if (!selectedId || !token) return;
    let cancelled = false;
    setCoverageLoading(true);
    api(`/layouts/${selectedId}/planogram/coverage`, { token })
      .then((c) => !cancelled && setCoverage(c))
      .catch(() => !cancelled && setCoverage(null))
      .finally(() => !cancelled && setCoverageLoading(false));
    return () => {
      cancelled = true;
    };
  }, [selectedId, token, selectedLayout?.contentRevision]);

  useEffect(() => {
    const v = selectedLayout?.vertical;
    if (!v || !token) {
      setCategories([]);
      return;
    }
    let cancelled = false;
    api(`/catalog/categories?vertical=${encodeURIComponent(v)}`, { token })
      .then((rows) => !cancelled && setCategories(Array.isArray(rows) ? rows : []))
      .catch(() => !cancelled && setCategories([]));
    return () => {
      cancelled = true;
    };
  }, [selectedLayout?.vertical, token]);

  const kpis = [
    { label: "Free space", value: summary ? `${summary.freeSpacePercent}%` : "—", emoji: "🟢" },
    { label: "Utilization", value: summary ? `${summary.utilizationPercent}%` : "—", emoji: "📈" },
    { label: "Shelves", value: summary ? String(summary.fixtureCount) : "—", emoji: "📦" },
    {
      label: "Products placed",
      value: coverage ? `${coverage.coveragePercent}%` : "—",
      emoji: "🏷️",
    },
  ];

  const spaceDonut = summary
    ? [
        { label: "Used", value: summary.usedAreaSqm, color: "#A30A2A" },
        { label: "Free", value: Math.max(0, summary.usableAreaSqm - summary.usedAreaSqm), color: "#e5e7eb" },
      ]
    : [];

  const categoryFill = (summary?.allocationByCategory || []).map((a) => ({
    label: a.categoryName,
    value: a.shelfCount,
    color: a.color,
  }));

  const isEmpty = summary && summary.fixtureCount === 0 && !(summary.allocationByCategory || []).length;

  function refreshCoverage() {
    if (!selectedId || !token) return;
    setCoverageLoading(true);
    api(`/layouts/${selectedId}/planogram/coverage`, { token })
      .then(setCoverage)
      .catch(() => setCoverage(null))
      .finally(() => setCoverageLoading(false));
  }

  return (
    <section className="fade module-page">
      <div className="module-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <h2 className="page-title">
          <span className="module-emoji">📊</span> Dashboard
        </h2>
        {onNewLayout ? (
          <button type="button" className="btn-primary" onClick={onNewLayout}>
            + New layout
          </button>
        ) : null}
      </div>

      <div className="dashboard-pipeline panel" style={{ display: "flex", gap: 0, padding: 0, overflow: "hidden" }}>
        {Object.entries(statusCounts).map(([status, count]) => (
          <button
            key={status}
            type="button"
            className="dashboard-pipeline-seg"
            style={{
              flex: 1,
              padding: "14px 16px",
              border: "none",
              borderRight: "1px solid #e5e7eb",
              background: "#fff",
              cursor: onNavigateLayouts ? "pointer" : "default",
              textAlign: "left",
            }}
            onClick={() => onNavigateLayouts?.(status)}
          >
            <div className="muted" style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase" }}>
              {STATUS_LABELS[status]}
            </div>
            <div className="mono" style={{ fontSize: 22, fontWeight: 700, color: STATUS_COLORS[status], marginTop: 4 }}>
              {count}
            </div>
          </button>
        ))}
      </div>

      <div className="dashboard-grid" style={{ marginTop: 16 }}>
        <div className="panel">
          <div className="section-label" style={{ marginBottom: 10 }}>Featured layout</div>
          {featured ? (
            <>
              <div style={{ fontSize: 16, fontWeight: 700 }}>{featured.name}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap" }}>
                <span
                  className="status-badge"
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    padding: "3px 8px",
                    borderRadius: 6,
                    background: `${STATUS_COLORS[featured.status || "draft"]}22`,
                    color: STATUS_COLORS[featured.status || "draft"],
                  }}
                >
                  {STATUS_LABELS[featured.status || "draft"]}
                </span>
                <span className="muted" style={{ fontSize: 12 }}>
                  {storeTypeForVertical(featured.vertical)?.label || (VERTICALS[featured.vertical] || VERTICALS.retail).label}
                </span>
              </div>
              <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>
                {featured.widthMeters}×{featured.depthMeters} m · Updated {featured.updatedAt?.slice(0, 10) || "—"}
              </div>
              <button
                type="button"
                className="btn-primary"
                style={{ marginTop: 12, padding: "8px 14px" }}
                onClick={() => onOpenLayout(featured)}
              >
                Open in editor →
              </button>
            </>
          ) : (
            <div className="muted" style={{ fontSize: 13 }}>No layouts yet. Create one to get started.</div>
          )}
        </div>

        <div className="panel">
          <div className="section-label" style={{ marginBottom: 10 }}>Quick actions</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {onNewLayout ? (
              <button type="button" className="btn-secondary" style={{ padding: "9px 12px" }} onClick={onNewLayout}>
                + New layout
              </button>
            ) : null}
            {featured ? (
              <button type="button" className="btn-secondary" style={{ padding: "9px 12px" }} onClick={() => onOpenLayout(featured)}>
                Open last edited
              </button>
            ) : null}
            {(role === "Approver" || role === "Admin") && statusCounts.in_review > 0 && onNavigateLayouts ? (
              <button type="button" className="btn-secondary" style={{ padding: "9px 12px" }} onClick={() => onNavigateLayouts("in_review")}>
                Pending approvals ({statusCounts.in_review})
              </button>
            ) : null}
            {onNavigateLayouts ? (
              <button type="button" className="btn-secondary" style={{ padding: "9px 12px" }} onClick={() => onNavigateLayouts("all")}>
                Browse all layouts →
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 16, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <span className="section-label" style={{ margin: 0 }}>Analytics layout</span>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          style={{ padding: "9px 11px", borderRadius: 8, border: "1px solid #e5e7eb", minWidth: 240, fontSize: 14 }}
        >
          {!sorted.length ? <option value="">No layouts yet</option> : null}
          {sorted.map((l) => {
            const st = storeTypeForVertical(l.vertical);
            return (
              <option key={l.id} value={l.id}>
                {l.name} · {st?.label || l.vertical}
              </option>
            );
          })}
        </select>
      </div>

      <div className="kpi-grid" style={{ marginTop: 16 }}>
        {kpis.map((k) => (
          <div key={k.label} className="panel kpi-card">
            <div className="kpi-emoji">{k.emoji}</div>
            <div className="muted" style={{ fontSize: 12 }}>{k.label}</div>
            <div className="mono kpi-value">{k.value}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="panel muted" style={{ marginTop: 16 }}>Loading layout analytics…</div>
      ) : !selectedLayout ? (
        <div className="empty-box" style={{ marginTop: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 700 }}>No layout selected</div>
          <div className="muted" style={{ fontSize: 13 }}>Create a layout to see its metrics here.</div>
        </div>
      ) : (
        <>
          {summary && isEmpty ? (
            <div className="empty-box" style={{ marginTop: 16 }}>
              <div style={{ fontSize: 15, fontWeight: 700 }}>This layout is empty</div>
              <div className="muted" style={{ fontSize: 13 }}>
                Open it and run Smart Generate to place shelves, then come back for charts.
              </div>
              <button type="button" className="btn-primary" style={{ marginTop: 12 }} onClick={() => onOpenLayout(selectedLayout)}>
                Open in editor
              </button>
            </div>
          ) : summary ? (
            <div className="dashboard-grid" style={{ marginTop: 16 }}>
              <div className="panel">
                <div className="section-label" style={{ marginBottom: 12 }}>Space usage</div>
                <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
                  <DonutChart data={spaceDonut} centerValue={`${summary.freeSpacePercent}%`} centerLabel="free" />
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
                    <div><span className="alloc-dot" style={{ background: "#A30A2A" }} /> Used · {summary.usedAreaSqm} m²</div>
                    <div><span className="alloc-dot" style={{ background: "#e5e7eb" }} /> Free · {Math.max(0, (summary.usableAreaSqm - summary.usedAreaSqm)).toFixed(2)} m²</div>
                  </div>
                </div>
              </div>
              <div className="panel">
                <div className="section-label" style={{ marginBottom: 12 }}>Category fill overview</div>
                {categoryFill.length ? (
                  <DonutChart data={categoryFill} centerValue={String(summary.fixtureCount)} centerLabel="shelves" />
                ) : (
                  <div className="muted">No categories mapped yet.</div>
                )}
              </div>
              <div className="panel dashboard-wide">
                <div className="section-label" style={{ marginBottom: 12 }}>Category shelf allocation</div>
                {categoryFill.length ? (
                  <BarChart data={categoryFill} unit=" shelves" />
                ) : (
                  <div className="muted">Assign categories to shelves in the layout editor.</div>
                )}
              </div>
            </div>
          ) : null}

          <MissingProductsPanel
            coverage={coverage}
            loading={coverageLoading}
            onRefresh={refreshCoverage}
            categories={categories}
            alwaysShow
            defaultOpen={Boolean(coverage?.missingCount)}
            title="Products not yet on shelves"
          />
        </>
      )}
    </section>
  );
}
