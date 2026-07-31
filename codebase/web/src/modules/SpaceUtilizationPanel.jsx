/** Rich space utilization view — §1.1 stacked breakdown with hero KPI. */
export default function SpaceUtilizationPanel({ space, compact = false }) {
  if (!space) {
    return <div className="muted space-util-empty">No layout area data yet.</div>;
  }

  const total = Math.max(0, Number(space.totalStoreAreaSqm) || 0);
  const segments = (space.breakdown || []).filter((b) => b.areaSqm > 0);
  const utilization = space.utilizationPercent ?? 0;
  const status = utilization >= 35 ? "healthy" : utilization >= 15 ? "moderate" : "low";

  const statusLabel = status === "healthy" ? "Good utilization" : status === "moderate" ? "Room to grow" : "Low utilization";
  const statusColor = status === "healthy" ? "oklch(0.5 0.12 150)" : status === "moderate" ? "#d97706" : "#64748b";

  return (
    <div className={`space-util-panel${compact ? " space-util-panel--compact" : ""}`}>
      <div className="space-util-head">
        <div className="space-util-head-copy">
          <div className="space-util-eyebrow">Store floor breakdown</div>
          <div className="space-util-total">
            <span className="space-util-total-val mono">{total.toLocaleString()}</span>
            <span className="space-util-total-unit">m² total</span>
          </div>
        </div>
        <div className="space-util-hero">
          <div className="space-util-hero-pct mono" style={{ color: "#A30A2A" }}>
            {utilization}%
          </div>
          <div className="space-util-hero-label">fixture utilization</div>
          <span className="space-util-status" style={{ color: statusColor, borderColor: `${statusColor}44`, background: `${statusColor}11` }}>
            {statusLabel}
          </span>
        </div>
      </div>

      <div className="space-util-stacked" role="img" aria-label="Space breakdown by category">
        {total > 0 && segments.length ? (
          segments.map((b) => {
            const pct = (b.areaSqm / total) * 100;
            return (
              <div
                key={b.key}
                className="space-util-seg"
                style={{ width: `${Math.max(pct, 1.5)}%`, background: b.color }}
                title={`${b.label}: ${b.areaSqm} m² (${pct.toFixed(1)}%)`}
              />
            );
          })
        ) : (
          <div className="space-util-seg space-util-seg--empty" />
        )}
      </div>

      <div className="space-util-tiles">
        {(space.breakdown || []).map((b) => {
          const pct = total > 0 ? ((b.areaSqm / total) * 100).toFixed(1) : "0";
          return (
            <div key={b.key} className="space-util-tile">
              <div className="space-util-tile-top">
                <span className="space-util-dot" style={{ background: b.color }} />
                <span className="space-util-tile-label">{b.label}</span>
              </div>
              <div className="space-util-tile-val mono">{b.areaSqm} m²</div>
              <div className="space-util-tile-pct muted">{pct}% of floor</div>
            </div>
          );
        })}
      </div>

      {!compact ? (
        <div className="space-util-foot muted">
          Allocated fixture footprint ÷ total store area = {utilization}% utilization ·
          {" "}{space.unusedAreaSqm ?? 0} m² free for expansion
        </div>
      ) : null}
    </div>
  );
}
