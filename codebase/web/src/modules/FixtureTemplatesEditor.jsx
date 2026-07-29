import { FIXTURE_TYPES } from "../referenceCatalog.js";

const TYPE_OPTIONS = Object.keys(FIXTURE_TYPES);

/** Edit shared store shelf layer (fixture templates) before layouts use them. */
export default function FixtureTemplatesEditor({ templates, onChange, disabled }) {
  const rows = templates?.length ? templates : [];

  function updateRow(idx, patch) {
    const next = rows.map((r, i) => (i === idx ? { ...r, ...patch } : r));
    onChange(next);
  }

  function addRow() {
    const used = new Set(rows.map((r) => r.type));
    const type = TYPE_OPTIONS.find((t) => !used.has(t)) || "shelf";
    onChange([
      ...rows,
      {
        type,
        defaultWidthMeters: FIXTURE_TYPES[type]?.w ?? 1.2,
        defaultDepthMeters: FIXTURE_TYPES[type]?.d ?? 0.6,
        defaultHeightMeters: 2,
        defaultLevels: type === "rack" ? 4 : type === "gondola" ? 3 : 2,
      },
    ]);
  }

  function removeRow(idx) {
    onChange(rows.filter((_, i) => i !== idx));
  }

  return (
    <div className="fixture-templates-editor">
      <div style={{ fontWeight: 700, marginBottom: 4 }}>Shelf layer (shared templates)</div>
      <p className="muted" style={{ fontSize: 12, margin: "0 0 10px" }}>
        Configure once per store type. New layouts, the palette, and Smart Generate all use these dimensions.
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {rows.map((row, idx) => (
          <div
            key={`${row.type}-${idx}`}
            className="fixture-template-row"
          >
            <div className="field" style={{ margin: 0 }}>
              <label>Type</label>
              <select
                value={row.type}
                disabled={disabled}
                onChange={(e) => {
                  const type = e.target.value;
                  updateRow(idx, {
                    type,
                    defaultWidthMeters: FIXTURE_TYPES[type]?.w ?? row.defaultWidthMeters,
                    defaultDepthMeters: FIXTURE_TYPES[type]?.d ?? row.defaultDepthMeters,
                  });
                }}
                style={{ padding: "7px 8px", borderRadius: 8, border: "1px solid #e5e7eb", width: "100%" }}
              >
                {TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {FIXTURE_TYPES[t].label}
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
            {!disabled ? (
              <button type="button" className="btn-secondary" style={{ padding: "8px 10px" }} onClick={() => removeRow(idx)}>
                Remove
              </button>
            ) : null}
          </div>
        ))}
      </div>
      {!disabled ? (
        <button type="button" className="btn-secondary" style={{ marginTop: 10, padding: "8px 12px" }} onClick={addRow}>
          Add fixture type
        </button>
      ) : null}
    </div>
  );
}
