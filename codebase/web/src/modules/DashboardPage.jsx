import { useEffect, useMemo, useState } from "react";
import { VERTICALS } from "../referenceCatalog.js";
import { api } from "../api.js";
import DonutChart from "./charts/DonutChart.jsx";
import BarChart from "./charts/BarChart.jsx";

export default function DashboardPage({ portfolio, layouts, token, onOpenLayout }) {
  const sorted = useMemo(
    () =>
      [...layouts].sort((a, b) => String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""))),
    [layouts]
  );

  const [selectedId, setSelectedId] = useState("");
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!selectedId && sorted.length) setSelectedId(sorted[0].id);
  }, [sorted, selectedId]);

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

  const selectedLayout = sorted.find((l) => l.id === selectedId);

  const kpis = [
    { label: "Free space", value: summary ? `${summary.freeSpacePercent}%` : "—", emoji: "🟢" },
    { label: "Utilization", value: summary ? `${summary.utilizationPercent}%` : "—", emoji: "📈" },
    { label: "Shelves", value: summary ? String(summary.fixtureCount) : "—", emoji: "📦" },
    { label: "Aisles", value: summary ? String(summary.aisleCount ?? 0) : "—", emoji: "🚶" },
    { label: "Facings", value: summary ? String(summary.facingsTotal ?? 0) : "—", emoji: "🏷️" },
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

  const facings = (summary?.facingsByCategory || []).map((f) => ({
    label: f.categoryName,
    value: f.facings,
    color: f.color,
  }));

  const isEmpty = summary && summary.fixtureCount === 0 && !(summary.allocationByCategory || []).length;

  return (
    <section className="fade module-page">
      <div className="module-header">
        <h2 className="page-title">
          <span className="module-emoji">📊</span> Dashboard
        </h2>
      </div>

      <div className="panel" style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <span className="section-label" style={{ margin: 0 }}>Layout</span>
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          style={{ padding: "9px 11px", borderRadius: 8, border: "1px solid #e5e7eb", minWidth: 240, fontSize: 14 }}
        >
          {!sorted.length ? <option value="">No layouts yet</option> : null}
          {sorted.map((l) => {
            const vm = VERTICALS[l.vertical] || VERTICALS.retail;
            return (
              <option key={l.id} value={l.id}>
                {l.name} · {vm.label}
              </option>
            );
          })}
        </select>
        {selectedLayout ? (
          <button
            type="button"
            className="btn-secondary"
            style={{ padding: "8px 14px", marginLeft: "auto" }}
            onClick={() => onOpenLayout(selectedLayout)}
          >
            Open in editor →
          </button>
        ) : null}
      </div>

      <div className="kpi-grid kpi-grid-5">
        {kpis.map((k) => (
          <div key={k.label} className="panel kpi-card">
            <div className="kpi-emoji">{k.emoji}</div>
            <div className="muted" style={{ fontSize: 12 }}>{k.label}</div>
            <div className="mono kpi-value">{k.value}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="panel muted">Loading layout analytics…</div>
      ) : !selectedLayout ? (
        <div className="empty-box">
          <div style={{ fontSize: 15, fontWeight: 700 }}>No layout selected</div>
          <div className="muted" style={{ fontSize: 13 }}>Create a layout to see its metrics here.</div>
        </div>
      ) : !summary ? (
        <div className="panel muted">Loading layout analytics…</div>
      ) : isEmpty ? (
        <div className="empty-box">
          <div style={{ fontSize: 15, fontWeight: 700 }}>This layout is empty</div>
          <div className="muted" style={{ fontSize: 13 }}>
            Open it and run Smart Generate to place shelves, then come back for charts.
          </div>
          <button type="button" className="btn-primary" style={{ marginTop: 12 }} onClick={() => onOpenLayout(selectedLayout)}>
            Open in editor
          </button>
        </div>
      ) : (
        <div className="dashboard-grid">
          <div className="panel">
            <div className="section-label" style={{ marginBottom: 12 }}>Space usage</div>
            <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
              <DonutChart
                data={spaceDonut}
                centerValue={`${summary.freeSpacePercent}%`}
                centerLabel="free"
              />
              <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
                <div><span className="alloc-dot" style={{ background: "#A30A2A" }} /> Used · {summary.usedAreaSqm} m²</div>
                <div><span className="alloc-dot" style={{ background: "#e5e7eb" }} /> Free · {Math.max(0, (summary.usableAreaSqm - summary.usedAreaSqm)).toFixed(2)} m²</div>
                <div className="muted">Usable floor · {summary.usableAreaSqm} m²</div>
              </div>
            </div>
          </div>

          <div className="panel">
            <div className="section-label" style={{ marginBottom: 12 }}>Category fill (shelves)</div>
            {categoryFill.length ? (
              <div style={{ display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap" }}>
                <DonutChart data={categoryFill} centerValue={String(summary.fixtureCount)} centerLabel="shelves" />
                <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, flex: 1, minWidth: 140 }}>
                  {categoryFill.map((c) => (
                    <div key={c.label} className="alloc-row">
                      <span className="alloc-dot" style={{ background: c.color }} />
                      <span style={{ flex: 1 }}>{c.label}</span>
                      <span className="mono">{c.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="muted">No categories mapped yet.</div>
            )}
          </div>

          <div className="panel dashboard-wide">
            <div className="section-label" style={{ marginBottom: 12 }}>
              Facings by category · {summary.facingsTotal} total
            </div>
            <BarChart data={facings} />
          </div>
        </div>
      )}

      <div className="panel">
        <div className="section-label" style={{ marginBottom: 12 }}>Portfolio</div>
        <div className="alloc-row"><span style={{ flex: 1 }}>Layouts</span><span className="mono">{portfolio?.layoutCount ?? "—"}</span></div>
        <div className="alloc-row"><span style={{ flex: 1 }}>Total shelves</span><span className="mono">{portfolio?.totalShelves ?? "—"}</span></div>
        <div className="alloc-row"><span style={{ flex: 1 }}>Avg utilization</span><span className="mono">{portfolio ? `${portfolio.avgUtilizationPercent}%` : "—"}</span></div>
        <div className="alloc-row"><span style={{ flex: 1 }}>Mapped categories</span><span className="mono">{portfolio?.mappedCategoryCount ?? "—"}</span></div>
      </div>
    </section>
  );
}
