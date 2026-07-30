/** Properties for aisle corridor vs shelf height/levels/usable width. */
import { FIXTURE_TYPES } from "../referenceCatalog.js";
import { isDoubleSided, isPairedShelf, shelfDisplayLabel, shelfCanvasFaceLabel, shelfFaceDisplayLabel } from "./shelfFaces.js";
import { isShelfLike } from "./planogramSegments.js";

function StoreTypeBanner({ emoji, label }) {
  if (!label) return null;
  return (
    <div className="props-store-type">
      <span className="props-store-type-kicker">Store type</span>
      <span className="props-store-type-value">
        {emoji ? `${emoji} ` : ""}
        {label}
      </span>
    </div>
  );
}

const TEMPERATURE_ZONES = {
  ambient: { emoji: "🌡️", label: "Ambient" },
  chilled: { emoji: "🧊", label: "Chilled" },
  frozen: { emoji: "❄️", label: "Frozen" },
};

function resolveShelfTypeLabel(type, fixtureTypes) {
  return (
    fixtureTypes.find((t) => t.type === type)?.label ||
    FIXTURE_TYPES[type]?.label ||
    type ||
    "Shelf"
  );
}

function ShelfTypeBanner({ type, fixtureTypes, temperatureZone }) {
  const typeLabel = resolveShelfTypeLabel(type, fixtureTypes);
  const zone = TEMPERATURE_ZONES[temperatureZone || "ambient"] || TEMPERATURE_ZONES.ambient;
  return (
    <div className="props-shelf-type">
      <span className="props-store-type-kicker">Shelf type</span>
      <span className="props-shelf-type-value">{typeLabel}</span>
      <span className="props-shelf-type-zone">
        {zone.emoji} {zone.label}
      </span>
    </div>
  );
}

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
        <StoreTypeBanner emoji={storeTypeEmoji} label={storeTypeLabel} />
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
        <StoreTypeBanner emoji={storeTypeEmoji} label={storeTypeLabel} />
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
  const levels = s.levels || [];
  const aisles = layout.aisles || [];
  const aisleLabel = shelfFaceDisplayLabel(s, aisles);
  const faceSummary = aisleLabel
    ? aisleLabel
    : isPairedShelf(s)
      ? `${shelfDisplayLabel(s, aisles)} (${s.pairRole === "back" ? "back" : "front"})`
      : isDoubleSided(s)
        ? `${shelfCanvasFaceLabel(s, "A", aisles, layout.shelves)} / ${shelfCanvasFaceLabel(s, "B", aisles, layout.shelves)}`
        : shelfDisplayLabel(s, aisles);

  return (
    <div className="props-panel">
      <StoreTypeBanner emoji={storeTypeEmoji} label={storeTypeLabel} />
      <ShelfTypeBanner type={s.type} fixtureTypes={fixtureTypes} temperatureZone={s.temperatureZone} />
      <div className="section-label">Shelf</div>
      <label style={{ fontSize: 11, color: "#9aa1ab", fontWeight: 600, marginTop: 4, display: "block" }}>
        Name
      </label>
      <input
        type="text"
        disabled={editDisabled}
        value={s.label || ""}
        placeholder={aisleLabel ? `Shelf ${aisleLabel}` : "Shelf"}
        onChange={(e) => onPatchShelf(s.id, { label: e.target.value })}
        style={{ width: "100%", padding: "8px 9px", borderRadius: 8, border: "1px solid #e5e7eb", fontWeight: 700 }}
      />
      <div className="mono" style={{ fontSize: 11, marginTop: 8, color: "#6b7280" }}>
        {faceSummary}
      </div>
      {fixtureTypes.length > 0 ? (
        <>
          <label style={{ fontSize: 11, color: "#9aa1ab", fontWeight: 600, marginTop: 10, display: "block" }}>
            Shelf type
          </label>
          <select
            disabled={editDisabled}
            value={s.type || fixtureTypes[0]?.type || "shelf"}
            onChange={(e) => onPatchShelf(s.id, { type: e.target.value })}
            style={{ width: "100%", padding: "8px 9px", borderRadius: 8, border: "1px solid #e5e7eb" }}
          >
            {fixtureTypes.map((t) => (
              <option key={t.type} value={t.type}>
                {t.label}
              </option>
            ))}
          </select>
        </>
      ) : null}
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
      <label style={{ fontSize: 11, color: "#9aa1ab", fontWeight: 600, marginTop: 10, display: "block" }}>
        Rotation (°)
      </label>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <input
          className="mono"
          type="number"
          min="0"
          max="359"
          step="1"
          disabled={editDisabled}
          value={Math.round(((Number(s.rotationDeg) || 0) % 360 + 360) % 360)}
          onChange={(e) => onPatchShelf(s.id, { rotationDeg: Number(e.target.value) })}
          style={{ flex: 1, padding: "8px 9px", borderRadius: 8, border: "1px solid #e5e7eb" }}
        />
        <button
          type="button"
          className="btn-secondary"
          style={{ padding: "6px 8px", fontSize: 11 }}
          disabled={editDisabled}
          onClick={() => onPatchShelf(s.id, { rotationDeg: (((Number(s.rotationDeg) || 0) - 90) % 360 + 360) % 360 })}
        >
          −90°
        </button>
        <button
          type="button"
          className="btn-secondary"
          style={{ padding: "6px 8px", fontSize: 11 }}
          disabled={editDisabled}
          onClick={() => onPatchShelf(s.id, { rotationDeg: ((Number(s.rotationDeg) || 0) + 90) % 360 })}
        >
          +90°
        </button>
      </div>
      <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>
        Drag canvas handles to resize · rotate handle for angle · Shift = 15° snap
      </div>
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
      {isShelfLike(s.type) ? (
        <button
          type="button"
          className="btn-secondary"
          style={{ width: "100%", padding: "9px 10px", marginTop: 10, fontSize: 12.5 }}
          onClick={() => onOpenPlanogram?.(s.id, "A")}
        >
          Open Planogram
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
