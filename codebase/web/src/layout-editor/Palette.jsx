import { ZONE_TYPES } from "../referenceCatalog.js";

/** Left sidebar palette: select, draw area, aisles, shelves. */
export default function Palette({
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
    <div className="palette">
      <button
        type="button"
        className={`tool-btn ${paletteTool === "select" ? "active" : ""}`}
        onClick={() => setPaletteTool("select")}
      >
        <div style={{ fontSize: 13, fontWeight: 700 }}>Select</div>
        <div className="mono" style={{ fontSize: 10.5, color: "#9aa1ab" }}>
          click · drag move
        </div>
      </button>

      <div className="section-label" style={{ padding: "10px 4px 6px" }}>
        Floor area
      </div>
      <button
        type="button"
        className={`tool-btn ${paletteTool === "draw" ? "active" : ""}`}
        disabled={editDisabled}
        onClick={() => setPaletteTool("draw")}
      >
        <div style={{ fontSize: 13, fontWeight: 700 }}>Draw area</div>
        <div className="mono" style={{ fontSize: 10.5, color: "#9aa1ab" }}>
          click · line preview · close shape
        </div>
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
        <div style={{ fontSize: 13, fontWeight: 700 }}>Edit area</div>
        <div className="mono" style={{ fontSize: 10.5, color: "#9aa1ab" }}>
          drag vertices · reshape
        </div>
      </button>
      <button
        type="button"
        className="tool-btn"
        disabled={editDisabled}
        onClick={onOpenGenerate}
        style={{ marginTop: 6 }}
      >
        <div style={{ fontSize: 13, fontWeight: 700 }}>Generate</div>
        <div className="mono" style={{ fontSize: 10.5, color: "#9aa1ab" }}>
          gondola pairs + walk aisles
        </div>
      </button>

      <div className="section-label" style={{ padding: "10px 4px 6px" }}>
        Aisles
      </div>
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
        <div style={{ fontSize: 13, fontWeight: 700 }}>Aisle (horizontal)</div>
        <div className="mono" style={{ fontSize: 10.5, color: "#9aa1ab" }}>
          east–west run · min {minAisle} m wide
        </div>
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
        <div style={{ fontSize: 13, fontWeight: 700 }}>Aisle (vertical)</div>
        <div className="mono" style={{ fontSize: 10.5, color: "#9aa1ab" }}>
          north–south run · min {minAisle} m wide
        </div>
      </button>

      <div className="section-label" style={{ padding: "10px 4px 6px" }}>
        Shelves
      </div>
      <div className="mono" style={{ fontSize: 10, color: "#9aa1ab", padding: "0 4px 6px" }}>
        From Admin → Store Master
      </div>
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
          <div style={{ fontSize: 13, fontWeight: 700 }}>
            {t.temperatureZone === "chilled" ? "🧊 " : t.temperatureZone === "frozen" ? "❄️ " : ""}
            {t.label}
          </div>
          <div className="mono" style={{ fontSize: 10.5, color: "#9aa1ab" }}>
            {t.defaultWidthMeters} × {t.defaultDepthMeters} m · {t.defaultLevels} lvl
          </div>
        </button>
      ))}

      <div className="section-label" style={{ padding: "10px 4px 6px" }}>
        Zones
      </div>
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
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700 }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: z.color, display: "inline-block" }} />
              {z.label}
            </div>
            <div className="mono" style={{ fontSize: 10.5, color: "#9aa1ab" }}>
              {z.hint} · draw rectangle
            </div>
          </button>
        );
      })}

      <div className="section-label" style={{ padding: "10px 4px 6px" }}>
        Entry
      </div>
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
        <div style={{ fontSize: 13, fontWeight: 700 }}>Entry point</div>
        <div className="mono" style={{ fontSize: 10.5, color: "#9aa1ab" }}>
          store entrance · click floor
        </div>
      </button>
    </div>
  );
}
