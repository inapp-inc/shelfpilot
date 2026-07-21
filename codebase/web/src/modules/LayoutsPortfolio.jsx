import { VERTICALS, STATUS_META } from "../referenceCatalog.js";
import { STORE_TYPES } from "../storeTypes.js";

export default function LayoutsPortfolio({
  layouts,
  statusFilter,
  onStatusFilter,
  onOpenLayout,
  onNewLayout,
  onDeleteLayout,
  editDisabled,
}) {
  const statusMeta = (s) => STATUS_META[s] || STATUS_META.draft;

  return (
    <section className="fade module-page">
      <div className="module-header">
        <h2 className="page-title">
          <span className="module-emoji">🗺️</span> Layouts
        </h2>
        <button className="btn-primary" style={{ padding: "11px 18px", fontSize: 14 }} onClick={onNewLayout}>
          + New layout
        </button>
      </div>

      <div className="filter-row">
        {["all", "draft", "in_review", "approved", "rejected"].map((f) => (
          <button
            key={f}
            type="button"
            className={`filter-chip ${statusFilter === f ? "active" : ""}`}
            onClick={() => onStatusFilter(f)}
          >
            {f === "all" ? "All" : statusMeta(f).label}
          </button>
        ))}
      </div>

      {!layouts.length ? (
        <div className="empty-box">
          <div style={{ fontSize: 15, fontWeight: 700 }}>No layouts match this filter</div>
          <div className="muted" style={{ fontSize: 13 }}>
            Try another status, or create a new layout.
          </div>
        </div>
      ) : (
        <div className="grid-cards">
          {layouts.map((l) => {
            const st = statusMeta(l.status);
            const storeType = STORE_TYPES.find((s) => s.vertical === l.vertical);
            const vm = VERTICALS[l.vertical] || VERTICALS.retail;
            return (
              <div
                key={l.id}
                role="button"
                tabIndex={0}
                className="project-card"
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
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span className="status-chip" style={{ background: st.bg, color: st.color }}>
                      {st.label}
                    </span>
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
