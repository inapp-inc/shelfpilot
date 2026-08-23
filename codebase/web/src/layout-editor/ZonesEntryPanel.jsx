import { ZONE_TYPES } from "../referenceCatalog.js";

/** Manage special zones and the single store entrance. */
export default function ZonesEntryPanel({
  layout,
  editDisabled,
  selection,
  onPatchZone,
  onDeleteZone,
  onPatchEntry,
  onDeleteEntry,
  onSelectZone,
}) {
  const zones = layout?.zones || [];
  const entrance = layout?.entryPoints?.[0] || null;

  return (
    <div className="zones-panel">
      <div className="section-label">Special zones</div>
      {zones.length === 0 ? (
        <div className="muted" style={{ fontSize: 12, marginBottom: 12 }}>
          Use the <strong>Zones</strong> palette tools (Hot / Offer / Special), then drag on the floor to
          draw a rectangle. A quick click places a default 3×3 m zone. Zones are merchandising overlays
          and don't affect shelf packing.
        </div>
      ) : (
        zones.map((z) => {
          const meta = ZONE_TYPES[z.type] || ZONE_TYPES.special;
          const selected = selection?.kind === "zone" && selection.id === z.id;
          return (
            <div
              key={z.id}
              className={`zone-card ${selected ? "selected" : ""}`}
              onClick={() => onSelectZone?.(z.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") onSelectZone?.(z.id);
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ width: 12, height: 12, borderRadius: 3, background: z.color || meta.color }} />
                <input
                  className="zone-input"
                  disabled={editDisabled}
                  value={z.name || ""}
                  placeholder={meta.label}
                  onChange={(e) => onPatchZone(z.id, { name: e.target.value })}
                  style={{ flex: 1 }}
                />
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <select
                  className="zone-input"
                  disabled={editDisabled}
                  value={z.type}
                  onChange={(e) => onPatchZone(z.id, { type: e.target.value, color: ZONE_TYPES[e.target.value]?.color })}
                >
                  {Object.entries(ZONE_TYPES).map(([key, m]) => (
                    <option key={key} value={key}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <input
                  type="color"
                  disabled={editDisabled}
                  value={z.color || meta.color}
                  onChange={(e) => onPatchZone(z.id, { color: e.target.value })}
                  style={{ width: 34, height: 30, padding: 0, border: "1px solid #e5e7eb", borderRadius: 6 }}
                />
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
                <label className="zone-dim-label">W</label>
                <input
                  className="zone-input mono"
                  type="number"
                  min="0.5"
                  step="0.5"
                  disabled={editDisabled}
                  value={z.widthMeters}
                  onChange={(e) => onPatchZone(z.id, { widthMeters: Number(e.target.value) })}
                  style={{ width: 64 }}
                />
                <label className="zone-dim-label">D</label>
                <input
                  className="zone-input mono"
                  type="number"
                  min="0.5"
                  step="0.5"
                  disabled={editDisabled}
                  value={z.depthMeters}
                  onChange={(e) => onPatchZone(z.id, { depthMeters: Number(e.target.value) })}
                  style={{ width: 64 }}
                />
                {!editDisabled ? (
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ padding: "4px 8px", fontSize: 11, marginLeft: "auto", color: "#A30A2A" }}
                    onClick={() => onDeleteZone(z.id)}
                  >
                    Delete
                  </button>
                ) : null}
              </div>
            </div>
          );
        })
      )}

      <div className="section-label" style={{ marginTop: 16 }}>
        Store entrance
      </div>
      {!entrance ? (
        <div className="muted" style={{ fontSize: 12 }}>
          Use <strong>Set entrance</strong> in the palette, then click on the floor plan. Placing again moves the
          entrance — each store has one door for shopper routing.
        </div>
      ) : (
        <div className={`zone-card${selection?.kind === "entryPoint" && selection.id === entrance.id ? " selected" : ""}`}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span className="entry-glyph" style={{ color: "#0369a1" }}>
              ⇥
            </span>
            <input
              className="zone-input"
              disabled={editDisabled}
              value={entrance.name || ""}
              placeholder="Entrance"
              onChange={(e) => onPatchEntry(entrance.id, { name: e.target.value })}
              style={{ flex: 1 }}
            />
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8 }}>
            <label className="zone-dim-label">Width</label>
            <input
              className="zone-input mono"
              type="number"
              min="0.5"
              step="0.1"
              disabled={editDisabled}
              value={entrance.widthMeters}
              onChange={(e) => onPatchEntry(entrance.id, { widthMeters: Number(e.target.value) })}
              style={{ width: 70 }}
            />
            {!editDisabled ? (
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: "4px 8px", fontSize: 11, marginLeft: "auto", color: "#A30A2A" }}
                onClick={() => onDeleteEntry(entrance.id)}
              >
                Clear
              </button>
            ) : null}
          </div>
          <p className="muted" style={{ fontSize: 11, margin: "8px 0 0" }}>
            Use <strong>Set entrance</strong> on the canvas to move this marker.
          </p>
        </div>
      )}
    </div>
  );
}
