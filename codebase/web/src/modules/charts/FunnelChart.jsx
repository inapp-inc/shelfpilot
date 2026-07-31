/** Horizontal funnel / progress bars for workflow stages. */
export default function FunnelChart({ stages = [] }) {
  if (!stages.length) {
    return <div className="muted" style={{ fontSize: 12.5 }}>No data.</div>;
  }
  const max = Math.max(1, ...stages.map((s) => s.count || 0));
  const colors = {
    draft: "#64748b",
    in_review: "#d97706",
    approved: "#16a34a",
    published: "#059669",
    rejected: "#dc2626",
  };
  return (
    <div className="funnel-chart">
      {stages.map((s) => {
        const pct = ((s.count || 0) / max) * 100;
        return (
          <div key={s.status} className="funnel-row">
            <span className="funnel-label">{formatStatus(s.status)}</span>
            <div className="funnel-bar-track">
              <div
                className="funnel-bar-fill"
                style={{ width: `${pct}%`, background: colors[s.status] || "#64748b" }}
              />
            </div>
            <span className="mono funnel-count">{s.count}</span>
          </div>
        );
      })}
    </div>
  );
}

function formatStatus(s) {
  return String(s || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
