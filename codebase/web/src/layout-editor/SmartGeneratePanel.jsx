import CategoryMixSliders from "./CategoryMixSliders.jsx";
import AlertBanner from "../components/AlertBanner.jsx";
import { categoryLabel } from "../catalog/buildCategoryTree.js";

export default function SmartGeneratePanel({
  open,
  onClose,
  minAisleWidth,
  onMinAisleWidthChange,
  orientation,
  onOrientationChange,
  categoryMix,
  onCategoryMixChange,
  fillPlanogram,
  onFillPlanogramChange,
  onGenerate,
  generating,
  disabled,
  lastGenStats,
  categories,
  fixtureTypes,
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
      <p className="muted smart-gen-hint" style={{ fontSize: 12, margin: 0 }}>
        Each gondola is a <strong>front + back</strong> shelf pair between two walk aisles. Shelves are labelled by aisle number (e.g. <strong>4A</strong>, <strong>4B</strong>).
      </p>
      <div className="smart-gen-scroll">
        <CategoryMixSliders
          mix={categoryMix}
          onChange={onCategoryMixChange}
          disabled={disabled}
          fixtureTypes={fixtureTypes}
        />
      </div>
      {total !== 100 ? (
        <AlertBanner variant="warning">
          Category mix must total 100% before generating (currently {total}%).
        </AlertBanner>
      ) : null}
      <label className="smart-gen-fill-row" style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
        <input
          type="checkbox"
          checked={fillPlanogram !== false}
          disabled={disabled}
          onChange={(e) => onFillPlanogramChange?.(e.target.checked)}
        />
        Auto-fill planogram with catalog products (matched to each shelf category)
      </label>
      {lastGenStats?.generated ? (
        <div className="smart-gen-results" style={{ fontSize: 12, marginTop: 8, display: "flex", flexDirection: "column", gap: 4 }}>
          <div>
            ✓ {lastGenStats.generated.gondolaUnits ?? lastGenStats.generated.shelves} gondola units ·{" "}
            {lastGenStats.generated.walkAisles ?? lastGenStats.generated.aisles} aisles
            {lastGenStats.generated.skippedOutsideCount
              ? ` · ${lastGenStats.generated.skippedOutsideCount} skipped outside`
              : " · 0 outside polygon"}
          </div>
          {lastGenStats.shelfMappings?.length ? (
            <div className="muted" style={{ fontSize: 11 }}>
              Categories assigned:{" "}
              {Object.entries(
                lastGenStats.shelfMappings.reduce((acc, m) => {
                  if (!m.categoryId) return acc;
                  acc[m.categoryId] = (acc[m.categoryId] || 0) + 1;
                  return acc;
                }, {})
              )
                .map(([id, n]) => `${categoryLabel(categories, id) || id} ×${n}`)
                .join(", ")}
            </div>
          ) : null}
          {lastGenStats.coverage ? (
            <div>
              ✓ {lastGenStats.coverage.placedCount}/{lastGenStats.coverage.totalProducts} products placed (
              {lastGenStats.coverage.coveragePercent}%)
              {lastGenStats.coverage.missingCount ? ` · ${lastGenStats.coverage.missingCount} SKUs unmatched` : ""}
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="smart-gen-actions">
        <span className="muted" style={{ fontSize: 12, flex: 1 }}>
          Assigns categories to gondola faces and places matching products on shelf levels
        </span>
        <button type="button" className="btn-primary" style={{ padding: "8px 14px" }} disabled={!canRun} onClick={onGenerate}>
          {generating ? "Generating…" : "Run smart generate"}
        </button>
      </div>
    </div>
  );
}
