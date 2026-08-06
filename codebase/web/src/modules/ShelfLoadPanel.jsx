import { KPI_ACCENT, utilizationTierColor } from "./charts/chartColors.js";
import { formatWeightFromKg } from "../units.js";

/**
 * Placed product weight against fixture safe working load. Shelves without any
 * weighed products are excluded from the "over limit" list, so an incomplete
 * catalog never reads as a false pass or a false failure.
 */
export default function ShelfLoadPanel({ load }) {
  if (!load) return <div className="muted">No weight data yet.</div>;

  const overloaded = load.overloadedShelves || [];
  const missing = load.productsMissingWeight || 0;

  return (
    <div className="shelf-load-panel">
      <div className="analytics-inline-kpi">
        <strong style={{ color: load.overloadedShelfCount ? KPI_ACCENT.danger : undefined }}>
          {formatWeightFromKg(load.totalLoadKg)}
        </strong>
        <span className="muted">
          of {formatWeightFromKg(load.totalCapacityKg)} capacity ({load.utilizationPercent}%)
        </span>
      </div>
      <div className="storage-volume-bar">
        <div
          className="storage-volume-bar-fill"
          style={{
            width: `${Math.min(100, Math.max(0, load.utilizationPercent || 0))}%`,
            background: load.overloadedShelfCount
              ? KPI_ACCENT.danger
              : utilizationTierColor(load.utilizationPercent || 0),
          }}
        />
      </div>

      {overloaded.length ? (
        <table className="analytics-table">
          <thead>
            <tr>
              <th>Shelf</th>
              <th>Load</th>
              <th>Limit</th>
              <th>Levels over</th>
            </tr>
          </thead>
          <tbody>
            {overloaded.map((s) => (
              <tr key={s.shelfId}>
                <td>{s.label}</td>
                <td className="mono" style={{ color: KPI_ACCENT.danger }}>
                  {formatWeightFromKg(s.totalLoadKg)}
                </td>
                <td className="mono">{formatWeightFromKg(s.totalLimitKg)}</td>
                <td className="mono">{s.overloadedLevels.join(", ") || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="muted" style={{ marginTop: 8 }}>
          Every fixture is within its safe working load.
        </div>
      )}

      {missing > 0 ? (
        <div className="muted" style={{ fontSize: 11, marginTop: 8 }}>
          {missing} of {load.productsTotal} products have no weight on file — add weights in the
          catalog for a complete load picture.
        </div>
      ) : null}
    </div>
  );
}
