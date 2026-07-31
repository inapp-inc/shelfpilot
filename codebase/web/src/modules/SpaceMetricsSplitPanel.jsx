import BarChart from "./charts/BarChart.jsx";
import ColumnChart from "./charts/ColumnChart.jsx";

/** Half-page split: vertical space by level (left) + fixture density & unmapped (right). */
export default function SpaceMetricsSplitPanel({ verticalLevels = [], fixtureDensity, fixtureDensityByZone, unmappedShelves }) {
  const levelChart = verticalLevels.map((lv) => ({
    label: lv.levelLabel,
    value: lv.utilizationPercent,
    color: lv.utilizationPercent >= 70 ? "#A30A2A" : lv.utilizationPercent >= 40 ? "#d97706" : "#94a3b8",
  }));

  const zones = fixtureDensityByZone?.rows || [];
  const zoneChart = zones.map((z) => ({
    label: z.label,
    value: z.fixturesPer100Sqm,
    color: "#64748b",
  }));

  return (
    <div className="space-metrics-split">
      <div className="space-metrics-half space-metrics-half--levels">
        <div className="space-metrics-half-head">
          <div className="section-label">Vertical space by level</div>
          <span className="muted space-metrics-half-sub">§1.4 tier utilization</span>
        </div>
        {levelChart.length ? (
          <>
            <ColumnChart data={levelChart} unit="%" max={100} height={150} />
            <div className="space-metrics-level-stats">
              {verticalLevels.map((lv) => (
                <div key={lv.levelIndex} className="space-metrics-level-stat">
                  <span className="space-metrics-level-name">{lv.levelLabel}</span>
                  <span className="mono">{lv.utilizedAreaSqm}/{lv.totalAreaSqm} m²</span>
                  <span className="muted">{lv.fixtureCount} fixtures</span>
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
          <div className="section-label">Fixture density</div>
          <span className="muted space-metrics-half-sub">§1.2 per zone</span>
        </div>
        <div className="space-metrics-density-kpi">
          <span className="mono space-metrics-density-val">{fixtureDensity?.fixturesPer100Sqm ?? "—"}</span>
          <span className="muted">fixtures / 100 m² store average</span>
        </div>
        {zoneChart.length ? (
          <BarChart data={zoneChart} unit="" />
        ) : (
          <div className="muted">No zone breakdown.</div>
        )}

        <div className="space-metrics-unmapped">
          <div className="space-metrics-unmapped-label">Unmapped shelf area</div>
          <div className="space-metrics-unmapped-row">
            <span className="mono space-metrics-unmapped-pct">{unmappedShelves?.emptyShelfPercent ?? 0}%</span>
            <span className="muted">{unmappedShelves?.emptyShelfAreaSqm ?? 0} m² · {unmappedShelves?.unmappedShelves?.length ?? 0} shelves</span>
          </div>
        </div>
      </div>
    </div>
  );
}
