/** Properties for aisle corridor vs shelf height/levels/usable width. */
import { shelfDisplayLabel, shelfFaceDisplayLabel } from "./shelfFaces.js";

export default function PropertiesPanel({
  selection,
  layout,
  editDisabled,
  minAisle,
  verticalLabel,
  storeTypeLabel,
  storeTypeEmoji,
  onPatchAisle,
  onPatchShelf,
  onDeleteAisle,
  onDeleteShelf,
  onOpenPlanogram,
  fixtureTypes = [],
}) {
  if (!selection) {
    return (
      <div className="props-panel">
        <div className="section-label">Properties</div>
        <div className="muted" style={{ fontSize: 12.5, fontStyle: "italic" }}>
          Select an aisle or shelf to configure spacing and height.
        </div>
      </div>
    );
  }

  if (selection.kind === "aisle") {
    const a = (layout.aisles || []).find((x) => x.id === selection.id);
    if (!a) return null;
    return (
      <div className="props-panel">
        <div className="section-label">Aisle corridor</div>
        <div style={{ fontSize: 14, fontWeight: 700 }}>
          {a.aisleNumber != null ? `Aisle ${a.aisleNumber}` : a.name || "Aisle"}
        </div>
        <label style={{ fontSize: 11, color: "#9aa1ab", fontWeight: 600, marginTop: 10, display: "block" }}>
          Width / aisle space (m)
        </label>
        <input
          className="mono"
          type="number"
          step="0.1"
          min={minAisle}
          disabled={editDisabled}
          value={a.widthMeters}
          onChange={(e) => onPatchAisle(a.id, { widthMeters: Number(e.target.value) })}
          style={{ width: "100%", padding: "8px 9px", borderRadius: 8, border: "1px solid #e5e7eb" }}
        />
        <label style={{ fontSize: 11, color: "#9aa1ab", fontWeight: 600, marginTop: 10, display: "block" }}>
          Run length (m)
        </label>
        <input
          className="mono"
          type="number"
          step="0.1"
          min="1"
          disabled={editDisabled}
          value={a.lengthMeters ?? ""}
          placeholder="Auto"
          onChange={(e) => onPatchAisle(a.id, { lengthMeters: Number(e.target.value) })}
          style={{ width: "100%", padding: "8px 9px", borderRadius: 8, border: "1px solid #e5e7eb" }}
        />
        <label style={{ fontSize: 11, color: "#9aa1ab", fontWeight: 600, marginTop: 10, display: "block" }}>
          Orientation
        </label>
        <select
          disabled={editDisabled}
          value={a.orientation === "vertical" ? "vertical" : "horizontal"}
          onChange={(e) => onPatchAisle(a.id, { orientation: e.target.value })}
          style={{ width: "100%", padding: "8px 9px", borderRadius: 8, border: "1px solid #e5e7eb" }}
        >
          <option value="horizontal">Horizontal (east–west run)</option>
          <option value="vertical">Vertical (north–south run)</option>
        </select>
        <div className="mono" style={{ fontSize: 11, marginTop: 6, color: "#6b7280" }}>
          Run × width:{" "}
          {(a.orientation === "vertical"
            ? `${Number(a.widthMeters || 0).toFixed(1)}×${(a.lengthMeters ?? 0).toFixed(1)}`
            : `${(a.lengthMeters ?? Math.max(2, layout.widthMeters * 0.35)).toFixed(1)}×${Number(a.widthMeters || 0).toFixed(1)}`)}{" "}
          m
        </div>
        <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>
          Min for {verticalLabel}: <span className="mono">{minAisle} m</span>
        </div>
        {!editDisabled ? (
          <button
            type="button"
            className="btn-danger"
            style={{ width: "100%", padding: "9px 10px", marginTop: 14, fontSize: 12.5 }}
            onClick={() => onDeleteAisle?.(a.id)}
          >
            Delete aisle
          </button>
        ) : null}
      </div>
    );
  }

  const s = (layout.shelves || layout.fixtures || []).find((x) => x.id === selection.id);
  if (!s) return null;

  const aisleLabel = shelfFaceDisplayLabel(s, layout.aisles || []);

  return (
    <div className="props-panel">
      <div className="section-label">Shelf</div>
      <div style={{ fontSize: 14, fontWeight: 700 }}>{aisleLabel || shelfDisplayLabel(s, layout.aisles)}</div>
      <p className="muted" style={{ fontSize: 12.5, margin: "10px 0 0", lineHeight: 1.45 }}>
        Click this shelf on the canvas to open the planogram dialog — name, dimensions, category, and product placement are all there.
      </p>
    </div>
  );
}
