import { FIXTURE_TYPES } from "../referenceCatalog.js";
import {
  FIXTURE_BASE_KINDS,
  SHELF_TYPE_PRESETS,
  TEMPERATURE_ZONES,
  normalizeFixtureTemplate,
  uniqueFixtureTypeId,
} from "../fixtureTypeUtils.js";
import {
  feetInputFromMeters,
  feetToMeters,
  formatVolumeFromCubicMeters,
  shelfEnvelopeVolumeM3,
} from "../units.js";

/** Compact Store Master shelf-template editor — dense rows, live volume. */
export default function FixtureTemplatesEditor({ templates, onChange, disabled }) {
  const rows = (templates?.length ? templates : []).map(normalizeFixtureTemplate);

  function updateRow(idx, patch) {
    const next = rows.map((r, i) => {
      if (i !== idx) return r;
      const merged = normalizeFixtureTemplate({ ...r, ...patch });
      if (patch.label != null && !patch.type) {
        const others = rows.filter((_, j) => j !== idx).map((x) => x.type);
        merged.type = uniqueFixtureTypeId(merged.label, others);
      }
      return merged;
    });
    onChange(next);
  }

  function updateDimFeet(idx, key, feetValue) {
    updateRow(idx, { [key]: feetToMeters(feetValue) });
  }

  function addPreset(preset) {
    const used = new Set(rows.map((r) => r.type));
    const type = used.has(preset.type) ? uniqueFixtureTypeId(preset.label, used) : preset.type;
    onChange([...rows, normalizeFixtureTemplate({ ...preset, type })]);
  }

  function addCustomRow() {
    const used = rows.map((r) => r.type);
    const label = "Custom shelf";
    onChange([
      ...rows,
      normalizeFixtureTemplate({
        type: uniqueFixtureTypeId(label, used),
        label,
        baseKind: "shelf",
        temperatureZone: "ambient",
      }),
    ]);
  }

  function removeRow(idx) {
    onChange(rows.filter((_, i) => i !== idx));
  }

  return (
    <div className="fixture-templates-editor" data-testid="fixture-templates-editor">
      {!disabled ? (
        <div className="fixture-toolbar">
          <div className="fixture-preset-chips" role="group" aria-label="Quick add shelf types">
            {SHELF_TYPE_PRESETS.slice(0, 3).map((preset) => (
              <button
                key={preset.type}
                type="button"
                className="btn-secondary fixture-preset-chip"
                onClick={() => addPreset(preset)}
              >
                + {preset.label}
              </button>
            ))}
            <button type="button" className="btn-secondary fixture-preset-chip" onClick={addCustomRow}>
              + Custom
            </button>
          </div>
          <span className="muted fixture-toolbar-hint">W / D / H in feet · volume auto</span>
        </div>
      ) : null}

      {!rows.length ? (
        <div className="fixture-templates-empty muted" data-testid="fixture-templates-empty">
          No shelf types yet — add Ambient, Chilled, Frozen, or Custom.
        </div>
      ) : (
        <div className="fixture-table-wrap">
          <table className="fixture-table" data-testid="fixture-templates-table">
            <thead>
              <tr>
                <th className="fixture-col-name">Name</th>
                <th className="fixture-col-base">Base</th>
                <th className="fixture-col-zone">Zone</th>
                <th className="fixture-col-num">W (ft)</th>
                <th className="fixture-col-num">D (ft)</th>
                <th className="fixture-col-num">H (ft)</th>
                <th className="fixture-col-num">Lvl</th>
                <th className="fixture-col-vol">Volume (cu ft)</th>
                {!disabled ? <th className="fixture-col-actions" aria-label="Actions" /> : null}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => {
                const volumeM3 = shelfEnvelopeVolumeM3(
                  row.defaultWidthMeters,
                  row.defaultDepthMeters,
                  row.defaultHeightMeters ?? 2
                );
                return (
                  <tr key={`${row.type}-${idx}`} data-testid={`fixture-template-card-${row.type}`}>
                    <td className="fixture-col-name">
                      <input
                        value={row.label}
                        disabled={disabled}
                        title={`ID: ${row.type}`}
                        placeholder="Shelf name"
                        aria-label="Shelf name"
                        onChange={(e) => updateRow(idx, { label: e.target.value })}
                      />
                    </td>
                    <td className="fixture-col-base">
                      <select
                        value={row.baseKind}
                        disabled={disabled}
                        aria-label="Base fixture"
                        onChange={(e) => {
                          const baseKind = e.target.value;
                          const fb = FIXTURE_TYPES[baseKind];
                          updateRow(idx, {
                            baseKind,
                            defaultWidthMeters: fb?.w ?? row.defaultWidthMeters,
                            defaultDepthMeters: fb?.d ?? row.defaultDepthMeters,
                          });
                        }}
                      >
                        {FIXTURE_BASE_KINDS.map((t) => (
                          <option key={t} value={t}>
                            {FIXTURE_TYPES[t].label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="fixture-col-zone">
                      <select
                        value={row.temperatureZone || "ambient"}
                        disabled={disabled}
                        aria-label="Temperature zone"
                        onChange={(e) => updateRow(idx, { temperatureZone: e.target.value })}
                      >
                        {TEMPERATURE_ZONES.map((z) => (
                          <option key={z.id} value={z.id}>
                            {z.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="fixture-col-num" data-testid={`fixture-dims-${row.type}`}>
                      <input
                        className="mono"
                        type="number"
                        step="0.1"
                        min="1"
                        disabled={disabled}
                        value={feetInputFromMeters(row.defaultWidthMeters)}
                        onChange={(e) => updateDimFeet(idx, "defaultWidthMeters", e.target.value)}
                        aria-label="Width feet"
                        data-testid={`fixture-width-ft-${row.type}`}
                      />
                    </td>
                    <td className="fixture-col-num">
                      <input
                        className="mono"
                        type="number"
                        step="0.1"
                        min="1"
                        disabled={disabled}
                        value={feetInputFromMeters(row.defaultDepthMeters)}
                        onChange={(e) => updateDimFeet(idx, "defaultDepthMeters", e.target.value)}
                        aria-label="Depth feet"
                        data-testid={`fixture-depth-ft-${row.type}`}
                      />
                    </td>
                    <td className="fixture-col-num">
                      <input
                        className="mono"
                        type="number"
                        step="0.1"
                        min="1.5"
                        disabled={disabled}
                        value={feetInputFromMeters(row.defaultHeightMeters ?? 2)}
                        onChange={(e) => updateDimFeet(idx, "defaultHeightMeters", e.target.value)}
                        aria-label="Height feet"
                        data-testid={`fixture-height-ft-${row.type}`}
                      />
                    </td>
                    <td className="fixture-col-num">
                      <input
                        className="mono"
                        type="number"
                        min="1"
                        max="8"
                        disabled={disabled}
                        value={row.defaultLevels ?? 2}
                        onChange={(e) => updateRow(idx, { defaultLevels: e.target.value })}
                        aria-label="Levels"
                        data-testid={`fixture-levels-${row.type}`}
                      />
                    </td>
                    <td className="fixture-col-vol" data-testid={`fixture-volume-${row.type}`}>
                      <span
                        className="fixture-vol-value mono"
                        title={volumeM3 != null ? "W × D × H (read-only)" : undefined}
                        data-testid={`fixture-volume-cuft-${row.type}`}
                      >
                        {volumeM3 != null ? formatVolumeFromCubicMeters(volumeM3, { decimals: 1 }) : "—"}
                      </span>
                    </td>
                    {!disabled ? (
                      <td className="fixture-col-actions">
                        <button
                          type="button"
                          className="fixture-row-remove"
                          aria-label={`Remove ${row.label || "shelf type"}`}
                          onClick={() => removeRow(idx)}
                        >
                          ×
                        </button>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
