import { FIXTURE_TYPES } from "../referenceCatalog.js";
import {
  FIXTURE_BASE_KINDS,
  SHELF_TYPE_PRESETS,
  TEMPERATURE_ZONES,
  normalizeFixtureTemplate,
  uniqueFixtureTypeId,
} from "../fixtureTypeUtils.js";

/** Edit shared store shelf layer (fixture templates) before layouts use them. */
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
    <div className="fixture-templates-editor">
      <div style={{ fontWeight: 700, marginBottom: 4 }}>Shelf types (shared templates)</div>
      <p className="muted" style={{ fontSize: 12, margin: "0 0 10px" }}>
        Add Ambient, Chilled, Frozen, or custom shelf types. Each type sets dimensions and levels used by the palette
        and Smart Generate.
      </p>
      {!disabled ? (
        <div className="fixture-preset-chips">
          {SHELF_TYPE_PRESETS.slice(0, 3).map((preset) => (
            <button
              key={preset.type}
              type="button"
              className="btn-secondary fixture-preset-chip"
              onClick={() => addPreset(preset)}
            >
              {preset.temperatureZone === "chilled" ? "🧊" : preset.temperatureZone === "frozen" ? "❄️" : "🛒"}{" "}
              {preset.label}
            </button>
          ))}
          <button type="button" className="btn-secondary fixture-preset-chip" onClick={addCustomRow}>
            + Custom shelf
          </button>
        </div>
      ) : null}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {rows.map((row, idx) => (
          <div key={`${row.type}-${idx}`} className="fixture-template-row">
            <div className="field" style={{ margin: 0 }}>
              <label>Shelf name</label>
              <input
                value={row.label}
                disabled={disabled}
                placeholder="e.g. Ambient, Chilled, Promo end"
                onChange={(e) => updateRow(idx, { label: e.target.value })}
                style={{ padding: "7px 8px", borderRadius: 8, border: "1px solid #e5e7eb", width: "100%" }}
              />
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label>Base fixture</label>
              <select
                value={row.baseKind}
                disabled={disabled}
                onChange={(e) => {
                  const baseKind = e.target.value;
                  const fb = FIXTURE_TYPES[baseKind];
                  updateRow(idx, {
                    baseKind,
                    defaultWidthMeters: fb?.w ?? row.defaultWidthMeters,
                    defaultDepthMeters: fb?.d ?? row.defaultDepthMeters,
                  });
                }}
                style={{ padding: "7px 8px", borderRadius: 8, border: "1px solid #e5e7eb", width: "100%" }}
              >
                {FIXTURE_BASE_KINDS.map((t) => (
                  <option key={t} value={t}>
                    {FIXTURE_TYPES[t].label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label>Zone</label>
              <select
                value={row.temperatureZone || "ambient"}
                disabled={disabled}
                onChange={(e) => updateRow(idx, { temperatureZone: e.target.value })}
                style={{ padding: "7px 8px", borderRadius: 8, border: "1px solid #e5e7eb", width: "100%" }}
              >
                {TEMPERATURE_ZONES.map((z) => (
                  <option key={z.id} value={z.id}>
                    {z.emoji} {z.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label>Width m</label>
              <input
                className="mono"
                type="number"
                step="0.1"
                min="0.3"
                disabled={disabled}
                value={row.defaultWidthMeters}
                onChange={(e) => updateRow(idx, { defaultWidthMeters: e.target.value })}
              />
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label>Depth m</label>
              <input
                className="mono"
                type="number"
                step="0.1"
                min="0.3"
                disabled={disabled}
                value={row.defaultDepthMeters}
                onChange={(e) => updateRow(idx, { defaultDepthMeters: e.target.value })}
              />
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label>Height m</label>
              <input
                className="mono"
                type="number"
                step="0.1"
                min="0.5"
                disabled={disabled}
                value={row.defaultHeightMeters ?? 2}
                onChange={(e) => updateRow(idx, { defaultHeightMeters: e.target.value })}
              />
            </div>
            <div className="field" style={{ margin: 0 }}>
              <label>Levels</label>
              <input
                className="mono"
                type="number"
                min="1"
                max="8"
                disabled={disabled}
                value={row.defaultLevels ?? 2}
                onChange={(e) => updateRow(idx, { defaultLevels: e.target.value })}
              />
            </div>
            <div className="field fixture-type-id-field" style={{ margin: 0 }}>
              <label>ID</label>
              <span className="mono muted" style={{ fontSize: 11 }} title="Internal type key">
                {row.type}
              </span>
            </div>
            {!disabled ? (
              <button type="button" className="btn-secondary" style={{ padding: "8px 10px" }} onClick={() => removeRow(idx)}>
                Remove
              </button>
            ) : null}
          </div>
        ))}
      </div>
      {!disabled ? (
        <button type="button" className="btn-secondary" style={{ marginTop: 10, padding: "8px 12px" }} onClick={addCustomRow}>
          Add shelf type
        </button>
      ) : null}
    </div>
  );
}
