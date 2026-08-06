import WidgetInfoTip from "./WidgetInfoTip.jsx";
import { CHART, KPI_ACCENT, mapSpaceBreakdown } from "./charts/chartColors.js";
import { formatAreaFromSqm } from "../units.js";

/** Rich space utilization view — §1.1 stacked breakdown with hero KPI. */
export default function SpaceUtilizationPanel({ space, compact = false, description }) {
  if (!space) {
    return <div className="muted space-util-empty">No layout area data yet.</div>;
  }

  const total = Math.max(0, Number(space.totalStoreAreaSqm) || 0);
  const usable = Math.max(0, Number(space.usableStoreAreaSqm) || total);
  const breakdown = mapSpaceBreakdown(space.breakdown || []);
  const segments = breakdown.filter((b) => b.areaSqm > 0);
  const utilization = space.utilizationPercent ?? 0;
  const vacancy = space.vacancyPercent ?? (usable > 0 ? Number((((space.unusedAreaSqm ?? 0) / usable) * 100).toFixed(1)) : 0);
  const unusedSqm = Number(space.unusedAreaSqm) || 0;

  // Status reflects fixture density and whether vacant floor remains.
  let status = "low";
  if (vacancy >= 20) status = "vacant";
  else if (utilization >= 35) status = "healthy";
  else if (utilization >= 15) status = "moderate";

  const statusLabel =
    status === "vacant"
      ? "Vacant floor available"
      : status === "healthy"
        ? "Good utilization"
        : status === "moderate"
          ? "Room to grow"
          : "Low utilization";
  const statusColor =
    status === "vacant"
      ? KPI_ACCENT.warning
      : status === "healthy"
        ? KPI_ACCENT.success
        : status === "moderate"
          ? KPI_ACCENT.warning
          : CHART.secondary;

  return (
    <div className={`space-util-panel${compact ? " space-util-panel--compact" : ""}`}>
      <div className="space-util-head">
        <div className="space-util-head-copy">
          <div className="space-util-eyebrow">
            Store floor breakdown
            {description ? <WidgetInfoTip text={description} label="Space utilization" /> : null}
            {space.formula ? (
              <WidgetInfoTip
                text={`Utilization: ${space.formula.utilizationPercent}. Vacant: ${space.formula.unusedAreaSqm}. Usable: ${space.formula.usableStoreAreaSqm}.`}
                label="How values are calculated"
              />
            ) : null}
          </div>
          <div className="space-util-total">
            <span className="space-util-total-val mono">{formatAreaFromSqm(total, { suffix: false })}</span>
            <span className="space-util-total-unit">sq ft total</span>
            {!compact ? (
              <span className="space-util-foot-inline muted">
                · {formatAreaFromSqm(unusedSqm)} vacant ({vacancy}%)
              </span>
            ) : null}
          </div>
        </div>
        <div className="space-util-hero">
          <div className="space-util-hero-pct mono" style={{ color: CHART.primary }}>
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
                title={`${b.label}: ${formatAreaFromSqm(b.areaSqm)} (${pct.toFixed(1)}%)`}
              />
            );
          })
        ) : (
          <div className="space-util-seg space-util-seg--empty" />
        )}
      </div>

      <div className="space-util-tiles">
        {breakdown.map((b) => {
          const pct = total > 0 ? ((b.areaSqm / total) * 100).toFixed(1) : "0";
          return (
            <div key={b.key} className={`space-util-tile${b.key === "unused" && unusedSqm > 0 ? " space-util-tile--vacant" : ""}`}>
              <div className="space-util-tile-top">
                <span className="space-util-dot" style={{ background: b.color }} />
                <span className="space-util-tile-label">{b.label}</span>
              </div>
              <div className="space-util-tile-val mono">{formatAreaFromSqm(b.areaSqm)}</div>
              <div className="space-util-tile-pct muted">{pct}%</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
