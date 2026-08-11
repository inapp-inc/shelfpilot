import { useRef, useState } from "react";
import { OBSTACLE_TYPES, obstacleMeta } from "../obstacleTypes.js";
import { resolveAssetUrl } from "../assetUrl.js";
import { metersToFeet } from "../units.js";

const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read that file"));
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(file);
  });
}

function ftHint(meters) {
  const ft = metersToFeet(Number(meters) || 0);
  return Number.isFinite(ft) ? `${ft.toFixed(1)} ft` : "";
}

/**
 * Floor-plan underlay + architectural obstacles.
 *
 * The underlay is calibrated by stating how wide and deep the drawing should be
 * in real metres, so the planner matches one known dimension (a wall run) and
 * then traces columns and boundaries over it.
 */
export default function FloorPlanPanel({
  layout,
  editDisabled,
  selection,
  onUploadFloorPlan,
  onPatchFloorPlan,
  onRemoveFloorPlan,
  onPatchObstacle,
  onDeleteObstacle,
  onSelectObstacle,
}) {
  const fileRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const plan = layout?.floorPlan || null;
  const obstacles = layout?.obstacles || [];

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      setError("Floor plan must be under 12 MB — export a flattened PNG or JPG.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      const dataBase64 = await readAsDataUrl(file);
      await onUploadFloorPlan({ dataBase64, fileName: file.name });
    } catch (err) {
      setError(err.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="zones-panel">
      <div className="section-label">Floor plan underlay</div>
      {!plan ? (
        <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>
          Upload the architect's drawing (PNG, JPG, WEBP or SVG), stretch it to a known dimension, then
          trace the boundary with <strong>Draw area</strong> and drop columns from the{" "}
          <strong>Structure</strong> palette.
        </div>
      ) : (
        <div className="zone-card" style={{ marginBottom: 10 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            <img
              src={resolveAssetUrl(plan.url)}
              alt="Floor plan"
              style={{
                width: 64,
                height: 64,
                objectFit: "contain",
                borderRadius: 6,
                border: "1px solid #e5e7eb",
                background: "#f8fafc",
              }}
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div className="mono" style={{ fontSize: 11, wordBreak: "break-all" }}>
                {plan.fileName || "floor-plan"}
              </div>
              <label style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 6, fontSize: 12 }}>
                <input
                  type="checkbox"
                  disabled={editDisabled}
                  checked={plan.visible !== false}
                  onChange={(e) => onPatchFloorPlan({ visible: e.target.checked })}
                />
                Show on canvas
              </label>
            </div>
          </div>

          <div style={{ marginTop: 10 }}>
            <label className="zone-dim-label">Opacity · {Math.round((plan.opacity ?? 0.5) * 100)}%</label>
            <input
              type="range"
              min="5"
              max="100"
              step="5"
              disabled={editDisabled}
              value={Math.round((plan.opacity ?? 0.5) * 100)}
              onChange={(e) => onPatchFloorPlan({ opacity: Number(e.target.value) / 100 })}
              style={{ width: "100%" }}
            />
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8, flexWrap: "wrap" }}>
            <label className="zone-dim-label" title="Drawing width in real metres">
              W
            </label>
            <input
              className="zone-input mono"
              type="number"
              min="0.5"
              step="0.1"
              disabled={editDisabled}
              value={plan.widthMeters}
              onChange={(e) => onPatchFloorPlan({ widthMeters: Number(e.target.value) })}
              style={{ width: 68 }}
            />
            <label className="zone-dim-label">D</label>
            <input
              className="zone-input mono"
              type="number"
              min="0.5"
              step="0.1"
              disabled={editDisabled}
              value={plan.depthMeters}
              onChange={(e) => onPatchFloorPlan({ depthMeters: Number(e.target.value) })}
              style={{ width: 68 }}
            />
            <span className="mono muted" style={{ fontSize: 11 }}>
              {ftHint(plan.widthMeters)} × {ftHint(plan.depthMeters)}
            </span>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8, flexWrap: "wrap" }}>
            <label className="zone-dim-label">X</label>
            <input
              className="zone-input mono"
              type="number"
              step="0.1"
              disabled={editDisabled}
              value={plan.x}
              onChange={(e) => onPatchFloorPlan({ x: Number(e.target.value) })}
              style={{ width: 68 }}
            />
            <label className="zone-dim-label">Y</label>
            <input
              className="zone-input mono"
              type="number"
              step="0.1"
              disabled={editDisabled}
              value={plan.y}
              onChange={(e) => onPatchFloorPlan({ y: Number(e.target.value) })}
              style={{ width: 68 }}
            />
            <label className="zone-dim-label">Rot</label>
            <input
              className="zone-input mono"
              type="number"
              step="15"
              disabled={editDisabled}
              value={plan.rotationDeg || 0}
              onChange={(e) => onPatchFloorPlan({ rotationDeg: Number(e.target.value) })}
              style={{ width: 68 }}
            />
          </div>

          {!editDisabled ? (
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: "4px 8px", fontSize: 11 }}
                disabled={busy}
                onClick={() => fileRef.current?.click()}
              >
                Replace
              </button>
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: "4px 8px", fontSize: 11, marginLeft: "auto", color: "#A30A2A" }}
                onClick={onRemoveFloorPlan}
              >
                Remove
              </button>
            </div>
          ) : null}
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        style={{ display: "none" }}
        onChange={handleFile}
      />
      {!plan && !editDisabled ? (
        <button
          type="button"
          className="btn-primary"
          data-testid="floorplan-upload"
          style={{ padding: "8px 10px", fontSize: 12, width: "100%" }}
          disabled={busy}
          onClick={() => fileRef.current?.click()}
        >
          {busy ? "Uploading…" : "Upload floor plan"}
        </button>
      ) : null}
      {error ? (
        <div className="muted" style={{ fontSize: 11, color: "#A30A2A", marginTop: 6 }}>
          {error}
        </div>
      ) : null}

      <div className="section-label" style={{ marginTop: 16 }}>
        Columns &amp; blocked areas
      </div>
      {obstacles.length === 0 ? (
        <div className="muted" style={{ fontSize: 12 }}>
          Use the <strong>Structure</strong> palette tools to drop columns, walls, or blocked areas.
          Fixtures cannot be placed on them, auto-generate routes around them, and their footprint is
          removed from usable floor area.
        </div>
      ) : (
        obstacles.map((o) => {
          const meta = obstacleMeta(o.type);
          const selected = selection?.kind === "obstacle" && selection.id === o.id;
          return (
            <div
              key={o.id}
              className={`zone-card ${selected ? "selected" : ""}`}
              role="button"
              tabIndex={0}
              onClick={() => onSelectObstacle?.(o.id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") onSelectObstacle?.(o.id);
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ width: 12, height: 12, borderRadius: 3, background: o.color || meta.color }} />
                <input
                  className="zone-input"
                  disabled={editDisabled}
                  value={o.name || ""}
                  placeholder={meta.label}
                  onChange={(e) => onPatchObstacle(o.id, { name: e.target.value })}
                  style={{ flex: 1 }}
                />
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <select
                  className="zone-input"
                  disabled={editDisabled}
                  value={o.type}
                  onChange={(e) =>
                    onPatchObstacle(o.id, { type: e.target.value, color: OBSTACLE_TYPES[e.target.value]?.color })
                  }
                >
                  {Object.entries(OBSTACLE_TYPES).map(([key, m]) => (
                    <option key={key} value={key}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <label className="zone-dim-label">W</label>
                <input
                  className="zone-input mono"
                  type="number"
                  min="0.05"
                  step="0.05"
                  disabled={editDisabled}
                  value={o.widthMeters}
                  onChange={(e) => onPatchObstacle(o.id, { widthMeters: Number(e.target.value) })}
                  style={{ width: 62 }}
                />
                <label className="zone-dim-label">D</label>
                <input
                  className="zone-input mono"
                  type="number"
                  min="0.05"
                  step="0.05"
                  disabled={editDisabled}
                  value={o.depthMeters}
                  onChange={(e) => onPatchObstacle(o.id, { depthMeters: Number(e.target.value) })}
                  style={{ width: 62 }}
                />
                {!editDisabled ? (
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ padding: "4px 8px", fontSize: 11, marginLeft: "auto", color: "#A30A2A" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteObstacle(o.id);
                    }}
                  >
                    Delete
                  </button>
                ) : null}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
