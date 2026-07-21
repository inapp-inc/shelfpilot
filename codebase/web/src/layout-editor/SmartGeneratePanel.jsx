import CategoryMixSliders from "./CategoryMixSliders.jsx";

export default function SmartGeneratePanel({
  open,
  onClose,
  minAisleWidth,
  onMinAisleWidthChange,
  orientation,
  onOrientationChange,
  categoryMix,
  onCategoryMixChange,
  onGenerate,
  generating,
  disabled,
}) {
  if (!open) return null;

  const total = categoryMix.reduce((s, r) => s + Number(r.percent || 0), 0);
  const canRun = total === 100 && !generating && !disabled;

  return (
    <div className="panel smart-generate-panel">
      <div className="smart-gen-header">
        <strong>✨ Smart generate</strong>
        <button type="button" className="btn-secondary" style={{ padding: "6px 10px", fontSize: 12 }} onClick={onClose}>
          Close
        </button>
      </div>
      <div className="smart-gen-fields">
        <div className="field" style={{ margin: 0 }}>
          <label>Aisle space (min width, m)</label>
          <input
            className="mono"
            type="number"
            step="0.1"
            min="0.5"
            value={minAisleWidth}
            disabled={disabled}
            onChange={(e) => onMinAisleWidthChange(e.target.value)}
          />
        </div>
        <div className="field" style={{ margin: 0 }}>
          <label>Orientation</label>
          <select
            value={orientation}
            disabled={disabled}
            onChange={(e) => onOrientationChange(e.target.value)}
            style={{ padding: "8px 9px", borderRadius: 8, border: "1px solid #e5e7eb", width: "100%" }}
          >
            <option value="mixed">Mixed (rows + columns)</option>
            <option value="auto">Auto</option>
            <option value="horizontal">Horizontal rows</option>
            <option value="vertical">Vertical columns</option>
          </select>
        </div>
      </div>
      <CategoryMixSliders mix={categoryMix} onChange={onCategoryMixChange} disabled={disabled} />
      <div className="smart-gen-actions">
        <span className="muted" style={{ fontSize: 12, flex: 1 }}>
          Maps shelves to categories incl. chilled / frozen zones
        </span>
        <button type="button" className="btn-primary" style={{ padding: "8px 14px" }} disabled={!canRun} onClick={onGenerate}>
          {generating ? "Generating…" : "Run smart generate"}
        </button>
      </div>
    </div>
  );
}
