import { VERTICALS, STATUS_META } from "../referenceCatalog.js";
import { STORE_TYPES } from "../storeTypes.js";

const DEMO_LAYOUT_MARKERS = ["Demo Hypermarket", "demo-generated"];

function isDemoReadyLayout(name) {
  const n = String(name || "").toLowerCase();
  return DEMO_LAYOUT_MARKERS.some((m) => n.includes(m.toLowerCase()));
}

export default function LayoutsPortfolio({
  layouts,
  statusFilter,
  onStatusFilter,
  onOpenLayout,
  onNewLayout,
  onDeleteLayout,
  onCloneLayout,
  editDisabled,
}) {
  const statusMeta = (s) => STATUS_META[s] || STATUS_META.draft;

  const sortedLayouts = [...layouts].sort((a, b) => {
    const aDemo = isDemoReadyLayout(a.name) ? 0 : 1;
    const bDemo = isDemoReadyLayout(b.name) ? 0 : 1;
    if (aDemo !== bDemo) return aDemo - bDemo;
    return String(b.updatedAt || "").localeCompare(String(a.updatedAt || ""));
  });

  return (
    <section className="fade module-page" data-testid="layouts-portfolio">
      <div className="module-header">
        <h2 className="page-title">
          <span className="module-emoji">🗺️</span> Layouts
        </h2>
        {editDisabled ? null : (
          <button
            className="btn-primary"
            data-testid="layout-create-open"
            style={{ padding: "11px 18px", fontSize: 14 }}
            onClick={onNewLayout}
          >
            + New layout
          </button>
        )}
      </div>

      <div className="filter-row" data-testid="layouts-status-filters">
        {["all", "draft", "in_review", "approved", "rejected"].map((f) => (
          <button
            key={f}
            type="button"
            data-testid={`layouts-filter-${f}`}
            className={`filter-chip ${statusFilter === f ? "active" : ""}`}
            onClick={() => onStatusFilter(f)}
          >
            {f === "all" ? "All" : statusMeta(f).label}
          </button>
        ))}
      </div>

      {!layouts.length ? (
        <div className="empty-box" data-testid="layouts-empty">
          <div style={{ fontSize: 15, fontWeight: 700 }}>No layouts match this filter</div>
          <div className="muted" style={{ fontSize: 13 }}>
            Try another status, or create a new layout.
          </div>
        </div>
      ) : (
        <div className="grid-cards" data-testid="layouts-grid">
          {sortedLayouts.map((l) => {
            const st = statusMeta(l.status);
            const storeType = STORE_TYPES.find((s) => s.vertical === l.vertical);
            const vm = VERTICALS[l.vertical] || VERTICALS.retail;
            const demoReady = isDemoReadyLayout(l.name);
            return (
              <div
                key={l.id}
                role="button"
                tabIndex={0}
                data-testid={`layout-card-${l.id}`}
                data-layout-name={l.name}
                data-demo-ready={demoReady ? "true" : "false"}
                className={`project-card${demoReady ? " project-card--demo" : ""}`}
                onClick={() => onOpenLayout(l)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onOpenLayout(l);
                  }
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1.3 }}>{l.name}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                    {demoReady ? (
                      <span className="status-chip" style={{ background: "#ecfdf5", color: "#047857" }}>
                        Demo ready
                      </span>
                    ) : null}
                    <span className="status-chip" style={{ background: st.bg, color: st.color }}>
                      {st.label}
                    </span>
                    {!editDisabled && onCloneLayout ? (
                      <button
                        type="button"
                        className="card-duplicate-btn"
                        title="Duplicate layout"
                        aria-label={`Duplicate ${l.name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onCloneLayout(l);
                        }}
                      >
                        ⧉
                      </button>
                    ) : null}
                    {!editDisabled && onDeleteLayout ? (
                      <button
                        type="button"
                        className="card-delete-btn"
                        title="Delete layout"
                        aria-label={`Delete ${l.name}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteLayout(l);
                        }}
                      >
                        🗑
                      </button>
                    ) : null}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 14 }}>{storeType?.emoji || "🏬"}</span>
                  <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 600 }}>
                    {storeType?.label || vm.label}
                  </span>
                  {l.widthMeters != null && l.depthMeters != null ? (
                    <span className="mono" style={{ fontSize: 11.5, color: "#9aa1ab", marginLeft: "auto" }}>
                      {Number(l.widthMeters).toFixed(1)} × {Number(l.depthMeters).toFixed(1)} m
                    </span>
                  ) : null}
                </div>
                <div style={{ height: 1, background: "#f0f0f0" }} />
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span className="mono" style={{ fontSize: 11, color: "#9aa1ab" }}>
                    {l.vertical}
                  </span>
                  <span style={{ fontSize: 11, color: "#9aa1ab" }}>
                    Updated {l.updatedAt ? String(l.updatedAt).slice(0, 10) : "—"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
