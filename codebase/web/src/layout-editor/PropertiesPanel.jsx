/** Properties for aisle corridor vs shelf height/levels/usable width. */
export default function PropertiesPanel({
  selection,
  layout,
  editDisabled,
  minAisle,
  verticalLabel,
  onPatchAisle,
  onPatchShelf,
  onDeleteAisle,
  onDeleteShelf,
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
        <div style={{ fontSize: 14, fontWeight: 700 }}>{a.name || "Aisle"}</div>
        <label style={{ fontSize: 11, color: "#9aa1ab", fontWeight: 600, marginTop: 10, display: "block" }}>
          Width / aisle space (m)
        </label>
        <input
          className="mono"
          type="number"
          step="0.1"
          disabled={editDisabled}
          value={a.widthMeters}
          onChange={(e) => onPatchAisle(a.id, { widthMeters: Number(e.target.value) })}
          style={{ width: "100%", padding: "8px 9px", borderRadius: 8, border: "1px solid #e5e7eb" }}
        />
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
  const levels = s.levels || [];

  return (
    <div className="props-panel">
      <div className="section-label">Shelf</div>
      <div style={{ fontSize: 14, fontWeight: 700 }}>{s.label || s.type}</div>
      <label style={{ fontSize: 11, color: "#9aa1ab", fontWeight: 600, marginTop: 10, display: "block" }}>
        Usable face width (m)
      </label>
      <input
        className="mono"
        type="number"
        step="0.1"
        disabled={editDisabled}
        value={s.usableWidthMeters ?? s.widthMeters}
        onChange={(e) =>
          onPatchShelf(s.id, {
            usableWidthMeters: Number(e.target.value),
            widthMeters: Number(e.target.value),
          })
        }
        style={{ width: "100%", padding: "8px 9px", borderRadius: 8, border: "1px solid #e5e7eb" }}
      />
      <label style={{ fontSize: 11, color: "#9aa1ab", fontWeight: 600, marginTop: 10, display: "block" }}>
        Height (m)
      </label>
      <input
        className="mono"
        type="number"
        step="0.1"
        disabled={editDisabled}
        value={s.heightMeters ?? 2}
        onChange={(e) => onPatchShelf(s.id, { heightMeters: Number(e.target.value) })}
        style={{ width: "100%", padding: "8px 9px", borderRadius: 8, border: "1px solid #e5e7eb" }}
      />
      <label style={{ fontSize: 11, color: "#9aa1ab", fontWeight: 600, marginTop: 10, display: "block" }}>
        Depth (m)
      </label>
      <input
        className="mono"
        type="number"
        step="0.1"
        disabled={editDisabled}
        value={s.depthMeters ?? 0.6}
        onChange={(e) => onPatchShelf(s.id, { depthMeters: Number(e.target.value) })}
        style={{ width: "100%", padding: "8px 9px", borderRadius: 8, border: "1px solid #e5e7eb" }}
      />
      <div className="section-label" style={{ marginTop: 14 }}>
        Levels ({levels.length})
      </div>
      {levels.map((lv, idx) => (
        <div key={lv.levelIndex ?? idx} className="mono" style={{ fontSize: 11, marginBottom: 4 }}>
          L{lv.levelIndex ?? idx}: floor {lv.heightFromFloorMeters ?? "—"} m · clear {lv.clearanceMeters ?? "—"} m
        </div>
      ))}
      {!editDisabled ? (
        <button
          className="btn-secondary"
          style={{ padding: "8px 10px", marginTop: 8, fontSize: 12 }}
          onClick={() => {
            const next = [
              ...levels,
              {
                levelIndex: levels.length,
                heightFromFloorMeters: 0.3 + levels.length * 0.45,
                clearanceMeters: 0.35,
              },
            ];
            onPatchShelf(s.id, { levels: next });
          }}
        >
          + Add level
        </button>
      ) : null}
      {!editDisabled ? (
        <button
          type="button"
          className="btn-danger"
          style={{ width: "100%", padding: "9px 10px", marginTop: 14, fontSize: 12.5 }}
          onClick={() => onDeleteShelf?.(s.id)}
        >
          Delete shelf
        </button>
      ) : null}
    </div>
  );
}
