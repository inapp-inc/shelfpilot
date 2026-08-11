import CategoryMixSliders from "./CategoryMixSliders.jsx";
import AlertBanner from "../components/AlertBanner.jsx";
import { categoryLabel } from "../catalog/buildCategoryTree.js";

export default function SmartGeneratePanel({
  open,
  onClose,
  minAisleWidth,
  storeMinAisleWidth,
  onMinAisleWidthChange,
  orientation,
  onOrientationChange,
  categoryMix,
  onCategoryMixChange,
  onGenerate,
  generating,
  disabled,
  lastGenStats,
  categories,
  fixtureTypes,
  hasDrawnArea = false,
  capacity = null,
  onDrawArea,
  warehouseMode = false,
}) {
  if (!open) return null;

  const mix = Array.isArray(categoryMix) ? categoryMix : [];
  const total = mix.reduce((s, r) => s + Number(r.percent || 0), 0);
  const defaultFixture = fixtureTypes?.[0]?.type || "";
  const missingFixture = mix.some((r) => !String(r.fixtureType || defaultFixture || "").trim());
  const noFixtures = !fixtureTypes?.length;
  const noArea = !hasDrawnArea;
  const canRun =
    total === 100 &&
    !generating &&
    !disabled &&
    mix.length > 0 &&
    !missingFixture &&
    !noFixtures &&
    !noArea;

  return (
    <div className="panel smart-generate-panel" data-testid="smart-generate-panel">
      <div className="smart-gen-header">
        <strong>Smart generate</strong>
        <button
          type="button"
          className="btn-secondary"
          data-testid="smart-generate-close"
          style={{ padding: "6px 10px", fontSize: 12 }}
          onClick={onClose}
        >
          Close
        </button>
      </div>

      <div className="smart-gen-capacity" data-testid="smart-generate-capacity">
        <div className="smart-gen-capacity-item">
          <span className="muted">Total space</span>
          <strong className="mono" data-testid="smart-generate-capacity-space">
            {capacity?.ready ? capacity.areaLabel : "—"}
          </strong>
        </div>
        <div className="smart-gen-capacity-item">
          <span className="muted">Shelves fit</span>
          <strong className="mono" data-testid="smart-generate-capacity-shelves">
            {capacity?.ready && capacity.maxShelves != null ? `~${capacity.maxShelves}` : "—"}
          </strong>
        </div>
      </div>

      {noFixtures ? (
        <AlertBanner variant="error" data-testid="smart-generate-fixture-error">
          Add shelf fixtures in Admin → Store Master before generating.
        </AlertBanner>
      ) : null}
      {noArea ? (
        <AlertBanner variant="error" data-testid="smart-generate-area-error">
          Draw and apply a fixture area on the floor plan first, then generate.
          {onDrawArea ? (
            <>
              {" "}
              <button type="button" className="linkish" onClick={onDrawArea}>
                Draw area
              </button>
            </>
          ) : null}
        </AlertBanner>
      ) : null}

      <div className="smart-gen-fields">
        <div className="field" style={{ margin: 0 }}>
          <label>Aisle space (min width, m)</label>
          <input
            className="mono"
            type="number"
            step="0.1"
            data-testid="smart-generate-min-aisle"
            min={storeMinAisleWidth != null ? Number(storeMinAisleWidth) : 0.5}
            value={minAisleWidth}
            disabled={disabled || noFixtures || noArea}
            onChange={(e) => onMinAisleWidthChange(e.target.value)}
          />
          {storeMinAisleWidth != null ? (
            <span className="muted" style={{ fontSize: 11 }} data-testid="smart-generate-store-rule">
              Store rule: ≥ {storeMinAisleWidth}m (Smart Generate will not go below this)
            </span>
          ) : null}
        </div>
        <div className="field" style={{ margin: 0 }}>
          <label>Orientation</label>
          <select
            value={orientation}
            disabled={disabled || noFixtures || noArea}
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
        {warehouseMode ? (
          <>
            Single-sided <strong>rack bays</strong> with forklift aisles (min {storeMinAisleWidth ?? 3}m). Draw a large
            fixture area — wide aisles need more floor space per bay.
          </>
        ) : (
          <>
            Each gondola is a <strong>front + back</strong> shelf pair between two walk aisles.
          </>
        )}
      </p>
      <div className="smart-gen-scroll">
        <CategoryMixSliders
          mix={mix}
          onChange={onCategoryMixChange}
          disabled={disabled || noFixtures || noArea}
          fixtureTypes={fixtureTypes}
        />
      </div>
      {!noFixtures && !noArea && missingFixture ? (
        <AlertBanner variant="warning" data-testid="smart-generate-fixture-missing">
          Choose a shelf fixture for every category in the mix.
        </AlertBanner>
      ) : null}
      {!noFixtures && !noArea && total !== 100 ? (
        <AlertBanner variant="warning">
          Category mix must total 100% before generating (currently {total}%).
        </AlertBanner>
      ) : null}
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
          Requires Store Master fixtures + drawn fixture area. Products are placed using catalog dimensions (wide × deep × stack).
        </span>
        <button
          type="button"
          className="btn-primary"
          data-testid="smart-generate-run"
          style={{ padding: "8px 14px" }}
          disabled={!canRun}
          onClick={onGenerate}
        >
          {generating ? "Generating…" : "Run smart generate"}
        </button>
      </div>
    </div>
  );
}
