import BarChart from "./charts/BarChart.jsx";
import ColumnChart from "./charts/ColumnChart.jsx";
import WidgetInfoTip from "./WidgetInfoTip.jsx";
import { CHART, utilizationTierColor } from "./charts/chartColors.js";
import { formatAreaFromSqm, formatLengthFromMeters } from "../units.js";

/** Half-page split: vertical space by level (left) + fixture density & unmapped (right). */
export default function SpaceMetricsSplitPanel({
  verticalLevels = [],
  fixtureDensity,
  fixtureDensityByZone,
  unmappedShelves,
}) {
  const linearMode = verticalLevels.some((lv) => lv.linearCapacityMeters != null);

  const levelChart = verticalLevels.map((lv) => ({
    label: lv.levelLabel,
    value: lv.utilizationPercent,
    color: utilizationTierColor(lv.utilizationPercent),
    title: linearMode
      ? `${lv.levelLabel}: ${formatLengthFromMeters(lv.usedLinearMeters ?? lv.utilizedAreaSqm, { suffix: false })} used ÷ ${formatLengthFromMeters(lv.linearCapacityMeters ?? lv.totalAreaSqm)} usable width = ${lv.utilizationPercent}%`
      : `${lv.levelLabel}: ${lv.utilizedAreaSqm} m² with products ÷ ${lv.totalAreaSqm} m² level share = ${lv.utilizationPercent}%`,
  }));

  const zones = fixtureDensityByZone?.rows || [];
  const zoneChart = zones.map((z) => ({
    label: z.label,
    value: z.fixturesPer100SqFt ?? z.fixturesPer100Sqm,
    color: CHART.secondary,
    title: `${z.label}: ${z.fixtureCount} physical units per 100 sq ft of zone`,
  }));

  const densityVal = fixtureDensity?.fixturesPer100SqFt ?? fixtureDensity?.fixturesPer100Sqm ?? "—";

  return (
    <div className="space-metrics-split">
      <div className="space-metrics-half space-metrics-half--levels">
        <div className="space-metrics-half-head">
          <div className="section-label">
            Vertical space by level
            <WidgetInfoTip
              text={
                linearMode
                  ? "Tier % = Σ min(usable width, facings × product width) per face-level ÷ Σ usable width × 100."
                  : "Tier % = shelf floor-share for levels that have products ÷ that level’s total share × 100. Empty mapped shelves do not count as filled."
              }
              label="Vertical utilization"
            />
          </div>
          <span className="muted space-metrics-half-sub">
            {linearMode ? "Linear fill by shelf level" : "§1.4 tier utilization"}
          </span>
        </div>
        {levelChart.length ? (
          <>
            <ColumnChart data={levelChart} unit="%" max={100} height={120} />
            <div className="space-metrics-level-stats">
              {verticalLevels.map((lv) => (
                <div
                  key={lv.levelIndex}
                  className="space-metrics-level-stat"
                  title={
                    linearMode
                      ? `${formatLengthFromMeters(lv.usedLinearMeters ?? lv.utilizedAreaSqm, { suffix: false })} / ${formatLengthFromMeters(lv.linearCapacityMeters ?? lv.totalAreaSqm)} linear`
                      : `${lv.utilizedAreaSqm} / ${lv.totalAreaSqm} m² with products`
                  }
                >
                  <span className="space-metrics-level-name">{lv.levelLabel}</span>
                  <span className="mono">
                    {linearMode
                      ? `${formatLengthFromMeters(lv.usedLinearMeters ?? lv.utilizedAreaSqm, { suffix: false })} / ${formatLengthFromMeters(lv.linearCapacityMeters ?? lv.totalAreaSqm)}`
                      : `${formatAreaFromSqm(lv.utilizedAreaSqm, { suffix: false })} / ${formatAreaFromSqm(lv.totalAreaSqm)}`}
                  </span>
                  <span className="muted">{lv.fixtureCount} face-levels</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="muted">No shelf levels configured.</div>
        )}
      </div>

      <div className="space-metrics-divider" aria-hidden="true" />

      <div className="space-metrics-half space-metrics-half--density">
        <div className="space-metrics-half-head">
          <div className="section-label">
            Fixture density
            <WidgetInfoTip
              text="Physical units (gondola pair = 1) ÷ (usable area in sq ft ÷ 100). Zone rows use each zone’s rectangle area."
              label="Fixture density"
            />
          </div>
          <span className="muted space-metrics-half-sub">§1.2 per zone</span>
        </div>
        <div className="space-metrics-density-kpi" title={fixtureDensity?.formula?.fixturesPer100SqFt}>
          <span className="mono space-metrics-density-val">{densityVal}</span>
          <span className="muted">fixtures / 100 sq ft store average</span>
        </div>
        {zoneChart.length ? (
          <BarChart data={zoneChart} unit="" formula="physicalUnits ÷ (zoneAreaSqFt / 100)" />
        ) : (
          <div className="muted">No zone breakdown.</div>
        )}

        <div className="space-metrics-unmapped" title={unmappedShelves?.formula}>
          <div className="space-metrics-unmapped-label">Unmapped shelf area</div>
          <div className="space-metrics-unmapped-row">
            <span className="mono space-metrics-unmapped-pct">{unmappedShelves?.emptyShelfPercent ?? 0}%</span>
            <span className="muted">
              {formatAreaFromSqm(unmappedShelves?.emptyShelfAreaSqm ?? 0)} · {unmappedShelves?.unmappedShelves?.length ?? 0}{" "}
              shelves
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
