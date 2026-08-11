import { ZONE_TYPES } from "../referenceCatalog.js";
import { OBSTACLE_TYPES } from "../obstacleTypes.js";

/** Left sidebar palette: select, draw area, aisles, shelves. */
export default function Palette({
  compact = false,
  paletteTool,
  setPaletteTool,
  editDisabled,
  minAisle,
  fixtureTypes = [],
  temporaryFixtureTypes = [],
  draftCount,
  onApplyArea,
  onClearDraft,
  onOpenGenerate,
  hasAppliedPolygon,
}) {
  return (
    <div className={`palette palette--nav${compact ? " palette--compact" : ""}`} data-testid="editor-palette">
      <div className="palette-nav-group">
        <button
          type="button"
          data-testid="palette-select"
          className={`tool-btn tool-btn--nav ${paletteTool === "select" ? "active" : ""}`}
          onClick={() => setPaletteTool("select")}
        >
          <span className="tool-btn-ico" aria-hidden>
            {"\u2196"}
          </span>
          <span className="tool-btn-copy">
            <span className="tool-btn-title">Select</span>
            {!compact ? <span className="tool-btn-sub">Move · resize</span> : null}
          </span>
        </button>
      </div>

      <div className="palette-nav-group">
        <div className="section-label palette-section-label">Floor</div>
        <button
          type="button"
          className={`tool-btn tool-btn--nav ${paletteTool === "draw" ? "active" : ""}`}
          disabled={editDisabled}
          onClick={() => setPaletteTool("draw")}
        >
          <span className="tool-btn-ico" aria-hidden>
            {"\u270E"}
          </span>
          <span className="tool-btn-copy">
            <span className="tool-btn-title">Draw area</span>
            {!compact ? <span className="tool-btn-sub">Trace boundary</span> : null}
          </span>
        </button>
        {draftCount > 0 ? (
          <div className="palette-draft-actions">
            <div className="mono palette-draft-count">{draftCount} vertices</div>
            <button
              type="button"
              className="btn-primary"
              style={{ padding: "8px 10px", fontSize: 12 }}
              disabled={editDisabled || draftCount < 3}
              onClick={onApplyArea}
            >
              Apply area
            </button>
            <button type="button" className="btn-secondary" style={{ padding: "8px 10px", fontSize: 12 }} onClick={onClearDraft}>
              Clear draft
            </button>
          </div>
        ) : null}
        <button
          type="button"
          className={`tool-btn tool-btn--nav ${paletteTool === "edit-area" ? "active" : ""}`}
          disabled={editDisabled || !hasAppliedPolygon}
          onClick={() => setPaletteTool("edit-area")}
        >
          <span className="tool-btn-ico" aria-hidden>
            {"\u25A3"}
          </span>
          <span className="tool-btn-copy">
            <span className="tool-btn-title">Edit area</span>
            {!compact ? <span className="tool-btn-sub">Reshape polygon</span> : null}
          </span>
        </button>
        <button
          type="button"
          className="tool-btn tool-btn--nav tool-btn--accent"
          data-testid="smart-generate-open"
          disabled={editDisabled}
          onClick={onOpenGenerate}
        >
          <span className="tool-btn-ico" aria-hidden>
            {"\u2728"}
          </span>
          <span className="tool-btn-copy">
            <span className="tool-btn-title">Smart generate</span>
            {!compact ? <span className="tool-btn-sub">Aisles + fixtures</span> : null}
          </span>
        </button>
      </div>

      <div className="palette-nav-group">
        <div className="section-label palette-section-label">Aisles</div>
        <button
          type="button"
          className={`tool-btn tool-btn--nav ${paletteTool === "aisle-h" || paletteTool === "aisle" ? "active" : ""}`}
          disabled={editDisabled}
          draggable={!editDisabled}
          onDragStart={(e) => {
            e.dataTransfer.setData("application/x-shelfpilot-tool", "aisle-h");
            e.dataTransfer.effectAllowed = "copy";
            setPaletteTool("aisle-h");
          }}
          onClick={() => setPaletteTool("aisle-h")}
        >
          <span className="tool-btn-ico" aria-hidden>
            {"\u2194"}
          </span>
          <span className="tool-btn-copy">
            <span className="tool-btn-title">Aisle H</span>
            {!compact ? <span className="tool-btn-sub">min {minAisle} m</span> : null}
          </span>
        </button>
        <button
          type="button"
          className={`tool-btn tool-btn--nav ${paletteTool === "aisle-v" ? "active" : ""}`}
          disabled={editDisabled}
          draggable={!editDisabled}
          onDragStart={(e) => {
            e.dataTransfer.setData("application/x-shelfpilot-tool", "aisle-v");
            e.dataTransfer.effectAllowed = "copy";
            setPaletteTool("aisle-v");
          }}
          onClick={() => setPaletteTool("aisle-v")}
        >
          <span className="tool-btn-ico" aria-hidden>
            {"\u2195"}
          </span>
          <span className="tool-btn-copy">
            <span className="tool-btn-title">Aisle V</span>
            {!compact ? <span className="tool-btn-sub">min {minAisle} m</span> : null}
          </span>
        </button>
      </div>

      <div className="palette-nav-group">
        <div className="section-label palette-section-label">Fixtures</div>
        {fixtureTypes.length === 0 ? (
          <div className="palette-empty-hint muted">
            No fixtures for this store type. Configure them in Admin → Store Master.
          </div>
        ) : (
          fixtureTypes.map((t) => (
            <button
              key={t.type}
              type="button"
              className={`tool-btn tool-btn--nav ${paletteTool === t.type ? "active" : ""}`}
              disabled={editDisabled}
              draggable={!editDisabled}
              onDragStart={(e) => {
                e.dataTransfer.setData("application/x-shelfpilot-tool", t.type);
                e.dataTransfer.effectAllowed = "copy";
                setPaletteTool(t.type);
              }}
              onClick={() => setPaletteTool(t.type)}
            >
              <span className="tool-btn-ico" aria-hidden>
                {t.temperatureZone === "chilled" ? "🧊" : t.temperatureZone === "frozen" ? "❄️" : "▤"}
              </span>
              <span className="tool-btn-copy">
                <span className="tool-btn-title">{t.label}</span>
                {!compact ? (
                  <span className="tool-btn-sub">
                    {t.defaultWidthMeters}×{t.defaultDepthMeters} m · {t.defaultLevels} lvl
                  </span>
                ) : null}
              </span>
            </button>
          ))
        )}
      </div>

      {temporaryFixtureTypes.length ? (
        <div className="palette-nav-group">
          <div className="section-label palette-section-label">Temporary storage</div>
          {temporaryFixtureTypes.map((t) => (
            <button
              key={t.type}
              type="button"
              data-testid={`palette-temp-${t.type}`}
              className={`tool-btn tool-btn--nav ${paletteTool === t.type ? "active" : ""}`}
              disabled={editDisabled}
              draggable={!editDisabled}
              onDragStart={(e) => {
                e.dataTransfer.setData("application/x-shelfpilot-tool", t.type);
                e.dataTransfer.effectAllowed = "copy";
                setPaletteTool(t.type);
              }}
              onClick={() => setPaletteTool(t.type)}
            >
              <span className="tool-btn-ico" aria-hidden>
                {t.type === "temp_pallet" ? "📦" : "▭"}
              </span>
              <span className="tool-btn-copy">
                <span className="tool-btn-title">{t.label}</span>
                {!compact ? (
                  <span className="tool-btn-sub">
                    {t.defaultWidthMeters}×{t.defaultDepthMeters} m · seasonal / promo
                  </span>
                ) : null}
              </span>
            </button>
          ))}
        </div>
      ) : null}

      <div className="palette-nav-group">
        <div className="section-label palette-section-label">Zones</div>
        {Object.entries(ZONE_TYPES).map(([key, z]) => {
          const tool = `zone:${key}`;
          return (
            <button
              key={key}
              type="button"
              className={`tool-btn tool-btn--nav ${paletteTool === tool ? "active" : ""}`}
              disabled={editDisabled}
              draggable={!editDisabled}
              onDragStart={(e) => {
                e.dataTransfer.setData("application/x-shelfpilot-tool", tool);
                e.dataTransfer.effectAllowed = "copy";
                setPaletteTool(tool);
              }}
              onClick={() => setPaletteTool(tool)}
            >
              <span className="zone-swatch tool-btn-swatch" style={{ background: z.color }} />
              <span className="tool-btn-copy">
                <span className="tool-btn-title">{z.label}</span>
                {!compact ? <span className="tool-btn-sub">{z.hint}</span> : null}
              </span>
            </button>
          );
        })}
      </div>

      <div className="palette-nav-group">
        <div className="section-label palette-section-label">Structure</div>
        {Object.entries(OBSTACLE_TYPES).map(([key, o]) => {
          const tool = `obstacle:${key}`;
          return (
            <button
              key={key}
              type="button"
              className={`tool-btn tool-btn--nav ${paletteTool === tool ? "active" : ""}`}
              disabled={editDisabled}
              draggable={!editDisabled}
              onDragStart={(e) => {
                e.dataTransfer.setData("application/x-shelfpilot-tool", tool);
                e.dataTransfer.effectAllowed = "copy";
                setPaletteTool(tool);
              }}
              onClick={() => setPaletteTool(tool)}
            >
              <span className="zone-swatch tool-btn-swatch" style={{ background: o.color }} />
              <span className="tool-btn-copy">
                <span className="tool-btn-title">{o.label}</span>
                {!compact ? (
                  <span className="tool-btn-sub">
                    {o.widthMeters}×{o.depthMeters} m
                  </span>
                ) : null}
              </span>
            </button>
          );
        })}
      </div>

      <div className="palette-nav-group">
        <div className="section-label palette-section-label">Entry</div>
        <button
          type="button"
          className={`tool-btn tool-btn--nav ${paletteTool === "entry" ? "active" : ""}`}
          disabled={editDisabled}
          draggable={!editDisabled}
          onDragStart={(e) => {
            e.dataTransfer.setData("application/x-shelfpilot-tool", "entry");
            e.dataTransfer.effectAllowed = "copy";
            setPaletteTool("entry");
          }}
          onClick={() => setPaletteTool("entry")}
        >
          <span className="tool-btn-ico" aria-hidden>
            {"\uD83D\uDEAA"}
          </span>
          <span className="tool-btn-copy">
            <span className="tool-btn-title">Entry point</span>
            {!compact ? <span className="tool-btn-sub">Store entrance</span> : null}
          </span>
        </button>
      </div>
    </div>
  );
}
