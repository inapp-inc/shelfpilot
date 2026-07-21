import { FIXTURE_TYPES, ZONE_TYPES } from "../referenceCatalog.js";

/** Left sidebar palette: select, draw area, aisles, shelves. */
export default function Palette({
  paletteTool,
  setPaletteTool,
  editDisabled,
  minAisle,
  draftCount,
  onApplyArea,
  onClearDraft,
  onOpenGenerate,
  hasAppliedPolygon,
}) {
  return (
    <div className="palette">
      <div className="section-label" style={{ padding: "2px 4px 6px" }}>
        Tools
      </div>
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
          click vertices · irregular
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
          aisles + shelves (smart)
        </div>
      </button>

      <div className="section-label" style={{ padding: "10px 4px 6px" }}>
        Aisles
      </div>
      <button
        type="button"
        className={`tool-btn ${paletteTool === "aisle" ? "active" : ""}`}
        disabled={editDisabled}
        draggable={!editDisabled}
        onDragStart={(e) => {
          e.dataTransfer.setData("application/x-shelfpilot-tool", "aisle");
          e.dataTransfer.effectAllowed = "copy";
          setPaletteTool("aisle");
        }}
        onClick={() => setPaletteTool("aisle")}
      >
        <div style={{ fontSize: 13, fontWeight: 700 }}>Aisle</div>
        <div className="mono" style={{ fontSize: 10.5, color: "#9aa1ab" }}>
          corridor · min {minAisle} m
        </div>
      </button>

      <div className="section-label" style={{ padding: "10px 4px 6px" }}>
        Shelves
      </div>
      {Object.entries(FIXTURE_TYPES).map(([key, t]) => (
        <button
          key={key}
          type="button"
          className={`tool-btn ${paletteTool === key ? "active" : ""}`}
          disabled={editDisabled}
          draggable={!editDisabled}
          onDragStart={(e) => {
            e.dataTransfer.setData("application/x-shelfpilot-tool", key);
            e.dataTransfer.effectAllowed = "copy";
            setPaletteTool(key);
          }}
          onClick={() => setPaletteTool(key)}
        >
          <div style={{ fontSize: 13, fontWeight: 700 }}>{t.label}</div>
          <div className="mono" style={{ fontSize: 10.5, color: "#9aa1ab" }}>
            {t.w} × {t.d} m · drag to floor
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
