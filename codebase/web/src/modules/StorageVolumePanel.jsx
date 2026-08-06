import { CHART, utilizationTierColor } from "./charts/chartColors.js";
import { formatVolumeFromCubicMeters } from "../units.js";
import { categoryDisplayName } from "../layout-editor/categoryFilter.js";
import { colorForCategoryId } from "../categoryColors.js";

/**
 * Available vs used shelf volume, and how the available volume is split across
 * categories. Available volume is the sum of each level's usable width × face
 * depth × clear height above the deck, so it reflects real shelf capacity rather
 * than the fixture's outer box.
 */
export default function StorageVolumePanel({ volume, categoryVolume, categories = [] }) {
  if (!volume) return <div className="muted">No storage volume data yet.</div>;

  const rows = categoryVolume?.rows || [];
  const totalAvailable = Number(volume.availableVolumeM3) || 0;

  return (
    <div className="storage-volume-panel">
      <div className="analytics-inline-kpi">
        <strong>{formatVolumeFromCubicMeters(volume.availableVolumeM3)}</strong>
        <span className="muted">available shelf volume</span>
      </div>
      <div className="storage-volume-bar" role="img" aria-label="Used vs free shelf volume">
        <div
          className="storage-volume-bar-fill"
          style={{
            width: `${Math.min(100, Math.max(0, volume.fillPercent || 0))}%`,
            background: utilizationTierColor(volume.fillPercent || 0),
          }}
        />
      </div>
      <div className="storage-volume-legend muted mono">
        {formatVolumeFromCubicMeters(volume.usedVolumeM3)} used ({volume.fillPercent}%) ·{" "}
        {formatVolumeFromCubicMeters(volume.freeVolumeM3)} free
      </div>

      {volume.levels?.length ? (
        <table className="analytics-table storage-volume-table">
          <thead>
            <tr>
              <th>Level</th>
              <th>Available</th>
              <th>Used</th>
              <th>Fill</th>
            </tr>
          </thead>
          <tbody>
            {volume.levels.map((lv) => (
              <tr key={lv.levelIndex}>
                <td>{lv.levelLabel}</td>
                <td className="mono">{formatVolumeFromCubicMeters(lv.availableVolumeM3)}</td>
                <td className="mono">{formatVolumeFromCubicMeters(lv.usedVolumeM3)}</td>
                <td className="mono" style={{ color: utilizationTierColor(lv.fillPercent) }}>
                  {lv.fillPercent}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      <div className="section-label" style={{ marginTop: 12 }}>
        Volume allocation by category
      </div>
      {rows.length ? (
        <div className="storage-volume-categories">
          {rows.map((r) => {
            const color = colorForCategoryId(categories, r.categoryId) || r.color || CHART.primary;
            const share = totalAvailable > 0 ? r.volumeSharePercent : 0;
            return (
              <div key={r.categoryId} className="storage-volume-cat">
                <div className="storage-volume-cat-head">
                  <span className="space-util-dot" style={{ background: color }} />
                  <span className="storage-volume-cat-name">
                    {categoryDisplayName(r.categoryId, categories) || r.categoryName}
                  </span>
                  <span className="mono muted">{share}%</span>
                </div>
                <div className="storage-volume-bar storage-volume-bar--slim">
                  <div
                    className="storage-volume-bar-fill"
                    style={{ width: `${Math.min(100, share)}%`, background: color }}
                  />
                </div>
                <div className="storage-volume-cat-foot muted mono">
                  {formatVolumeFromCubicMeters(r.availableVolumeM3)} available ·{" "}
                  {formatVolumeFromCubicMeters(r.usedVolumeM3)} used ({r.fillPercent}% full)
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="muted">Map categories to shelves to see volume allocation.</div>
      )}
    </div>
  );
}
