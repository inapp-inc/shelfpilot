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
  draftCount,
  onApplyArea,
  onClearDraft,
  onOpenGenerate,
  hasAppliedPolygon,
}) {
  return (
    <div className={`palette${compact ? " palette--compact" : ""}`} data-testid="editor-palette">
      <button
        type="button"
        data-testid="palette-select"
        className={`tool-btn ${paletteTool === "select" ? "active" : ""}`}
        onClick={() => setPaletteTool("select")}
      >
        <div className="tool-btn-title">Select</div>
        {!compact ? (
          <div className="tool-btn-sub mono">click · drag move</div>
        ) : null}
      </button>

      <div className="section-label palette-section-label">Floor</div>
      <button
        type="button"
        className={`tool-btn ${paletteTool === "draw" ? "active" : ""}`}
        disabled={editDisabled}
        onClick={() => setPaletteTool("draw")}
      >
        <div className="tool-btn-title">Draw area</div>
        {!compact ? (
          <div className="tool-btn-sub mono">click · line preview · close shape</div>
        ) : null}
      </button>
      {draftCount > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6, padding: "4px 2px" }}>
          <div className="mono" style={{ fontSize: 11, color: "#6b7280" }}>
            {draftCount} vertices
          </div>
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
        className={`tool-btn ${paletteTool === "edit-area" ? "active" : ""}`}
        disabled={editDisabled || !hasAppliedPolygon}
        onClick={() => setPaletteTool("edit-area")}
      >
        <div className="tool-btn-title">Edit area</div>
        {!compact ? (
          <div className="tool-btn-sub mono">drag vertices · reshape</div>
        ) : null}
      </button>
      <button
        type="button"
        className="tool-btn tool-btn--accent"
        data-testid="smart-generate-open"
        disabled={editDisabled}
        onClick={onOpenGenerate}
      >
        <div className="tool-btn-title">Generate</div>
        {!compact ? (
          <div className="tool-btn-sub mono">gondola pairs + walk aisles</div>
        ) : null}
      </button>

      <div className="section-label palette-section-label">Aisles</div>
      <button
        type="button"
        className={`tool-btn ${paletteTool === "aisle-h" || paletteTool === "aisle" ? "active" : ""}`}
        disabled={editDisabled}
        draggable={!editDisabled}
        onDragStart={(e) => {
          e.dataTransfer.setData("application/x-shelfpilot-tool", "aisle-h");
          e.dataTransfer.effectAllowed = "copy";
          setPaletteTool("aisle-h");
        }}
        onClick={() => setPaletteTool("aisle-h")}
      >
        <div className="tool-btn-title">Aisle H</div>
        {!compact ? (
          <div className="tool-btn-sub mono">east–west · min {minAisle} m</div>
        ) : null}
      </button>
      <button
        type="button"
        className={`tool-btn ${paletteTool === "aisle-v" ? "active" : ""}`}
        disabled={editDisabled}
        draggable={!editDisabled}
        onDragStart={(e) => {
          e.dataTransfer.setData("application/x-shelfpilot-tool", "aisle-v");
          e.dataTransfer.effectAllowed = "copy";
          setPaletteTool("aisle-v");
        }}
        onClick={() => setPaletteTool("aisle-v")}
      >
        <div className="tool-btn-title">Aisle V</div>
        {!compact ? (
          <div className="tool-btn-sub mono">north–south · min {minAisle} m</div>
        ) : null}
      </button>

      <div className="section-label palette-section-label">Fixtures</div>
      {fixtureTypes.map((t) => (
        <button
          key={t.type}
          type="button"
          className={`tool-btn ${paletteTool === t.type ? "active" : ""}`}
          disabled={editDisabled}
          draggable={!editDisabled}
          onDragStart={(e) => {
            e.dataTransfer.setData("application/x-shelfpilot-tool", t.type);
            e.dataTransfer.effectAllowed = "copy";
            setPaletteTool(t.type);
          }}
          onClick={() => setPaletteTool(t.type)}
        >
          <div className="tool-btn-title">
            {t.temperatureZone === "chilled" ? "🧊 " : t.temperatureZone === "frozen" ? "❄️ " : ""}
            {t.label}
          </div>
          {!compact ? (
            <div className="tool-btn-sub mono">
              {t.defaultWidthMeters} × {t.defaultDepthMeters} m · {t.defaultLevels} lvl
            </div>
          ) : null}
        </button>
      ))}

      <div className="section-label palette-section-label">Zones</div>
      {Object.entries(ZONE_TYPES).map(([key, z]) => {
        const tool = `zone:${key}`;
        return (
          <button
            key={key}
            type="button"
            className={`tool-btn ${paletteTool === tool ? "active" : ""}`}
            disabled={editDisabled}
            draggable={!editDisabled}
            onDragStart={(e) => {
              e.dataTransfer.setData("application/x-shelfpilot-tool", tool);
              e.dataTransfer.effectAllowed = "copy";
              setPaletteTool(tool);
            }}
            onClick={() => setPaletteTool(tool)}
          >
            <div className="tool-btn-title tool-btn-title--row">
              <span className="zone-swatch" style={{ background: z.color }} />
              {z.label}
            </div>
            {!compact ? (
              <div className="tool-btn-sub mono">{z.hint} · drag on floor</div>
            ) : null}
          </button>
        );
      })}

      <div className="section-label palette-section-label">Structure</div>
      {Object.entries(OBSTACLE_TYPES).map(([key, o]) => {
        const tool = `obstacle:${key}`;
        return (
          <button
            key={key}
            type="button"
            className={`tool-btn ${paletteTool === tool ? "active" : ""}`}
            disabled={editDisabled}
            draggable={!editDisabled}
            onDragStart={(e) => {
              e.dataTransfer.setData("application/x-shelfpilot-tool", tool);
              e.dataTransfer.effectAllowed = "copy";
              setPaletteTool(tool);
            }}
            onClick={() => setPaletteTool(tool)}
          >
            <div className="tool-btn-title tool-btn-title--row">
              <span className="zone-swatch" style={{ background: o.color }} />
              {o.label}
            </div>
            {!compact ? (
              <div className="tool-btn-sub mono">
                {o.hint} · {o.widthMeters}×{o.depthMeters} m
              </div>
            ) : null}
          </button>
        );
      })}

      <div className="section-label palette-section-label">Entry</div>
      <button
        type="button"
        className={`tool-btn ${paletteTool === "entry" ? "active" : ""}`}
        disabled={editDisabled}
        draggable={!editDisabled}
        onDragStart={(e) => {
          e.dataTransfer.setData("application/x-shelfpilot-tool", "entry");
          e.dataTransfer.effectAllowed = "copy";
          setPaletteTool("entry");
        }}
        onClick={() => setPaletteTool("entry")}
      >
        <div className="tool-btn-title">Entry point</div>
        {!compact ? (
          <div className="tool-btn-sub mono">store entrance · click floor</div>
        ) : null}
      </button>
    </div>
  );
}
