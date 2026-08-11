import { useState } from "react";
import ShelfGotoInput from "./ShelfGotoInput.jsx";

/** Single compact strip above the canvas — dimensions, capacity, navigation, zoom. */
export default function EditorCanvasBar({
  view3d,
  editDisabled,
  storeW,
  storeD,
  fixtureW,
  fixtureD,
  onStoreWChange,
  onStoreDChange,
  onFixtureWChange,
  onFixtureDChange,
  onEnvelopePatch,
  onFixturePatch,
  envelope,
  hasPolygon,
  zoom,
  onZoomDelta,
  onZoomReset,
  onFitView,
  shelfLabelOptions,
  onGoToShelf,
  zoomCategories,
  onCategoryZoom,
  capacity = null,
  onGrowStore,
  showShelfLabelHint = false,
  layoutHasShelves = false,
  arrangementAccepted = false,
  onOpenArrangement,
  ctrlHeld = false,
}) {
  const [dimsOpen, setDimsOpen] = useState(false);

  if (view3d) {
    return (
      <div className="editor-canvas-bar editor-canvas-bar--minimal">
        <span className="muted" style={{ fontSize: 11 }}>
          3D preview — 2D layout is the source of truth
        </span>
      </div>
    );
  }

  const ready = Boolean(capacity?.ready);
  const areaLabel = capacity?.areaLabel || "—";
  const maxShelves = capacity?.maxShelves;

  return (
    <div className="editor-canvas-bar">
      <div className="editor-canvas-bar-left">
        <button
          type="button"
          className={`editor-canvas-chip${dimsOpen ? " active" : ""}`}
          onClick={() => setDimsOpen((v) => !v)}
          title="Store & fixture dimensions"
        >
          Size
        </button>
        {dimsOpen ? (
          <div className="editor-dims-inline">
            <label>
              Store
              <input
                className="mono"
                type="number"
                step="0.5"
                min="1"
                disabled={editDisabled}
                value={storeW}
                onChange={(e) => {
                  onStoreWChange(e.target.value);
                  onEnvelopePatch(e.target.value, storeD);
                }}
              />
              <span>×</span>
              <input
                className="mono"
                type="number"
                step="0.5"
                min="1"
                disabled={editDisabled}
                value={storeD}
                onChange={(e) => {
                  onStoreDChange(e.target.value);
                  onEnvelopePatch(storeW, e.target.value);
                }}
              />
              <span>m</span>
            </label>
            <label>
              Fixture
              <input
                className="mono"
                type="number"
                step="0.5"
                min="0.5"
                max={envelope ? envelope.widthMeters : undefined}
                disabled={editDisabled}
                value={fixtureW}
                onChange={(e) => {
                  onFixtureWChange(e.target.value);
                  onFixturePatch(e.target.value, fixtureD);
                }}
              />
              <span>×</span>
              <input
                className="mono"
                type="number"
                step="0.5"
                min="0.5"
                max={envelope ? envelope.depthMeters : undefined}
                disabled={editDisabled}
                value={fixtureD}
                onChange={(e) => {
                  onFixtureDChange(e.target.value);
                  onFixturePatch(fixtureW, e.target.value);
                }}
              />
              <span>m</span>
            </label>
            {hasPolygon ? (
              <button type="button" className="editor-canvas-chip" disabled={editDisabled} onClick={onGrowStore}>
                +2m envelope
              </button>
            ) : null}
          </div>
        ) : null}

        <div
          className={`editor-capacity-strip${ready ? " is-ready" : ""}`}
          data-testid="editor-capacity-strip"
          title={
            ready
              ? "Drawn fixture area × Store Master shelf templates (≈65% after aisles)"
              : "Configure Store Master shelf types and draw the fixture area to see capacity"
          }
        >
          <span className="editor-capacity-item">
            <span className="editor-capacity-label">Total space</span>
            <strong className="mono" data-testid="editor-capacity-space">
              {ready ? areaLabel : "—"}
            </strong>
          </span>
          <span className="editor-capacity-sep" aria-hidden>
            ·
          </span>
          <span className="editor-capacity-item">
            <span className="editor-capacity-label">Shelves fit</span>
            <strong className="mono" data-testid="editor-capacity-shelves">
              {ready && maxShelves != null ? `~${maxShelves}` : "—"}
            </strong>
          </span>
        </div>

        <ShelfGotoInput
          options={shelfLabelOptions}
          onGo={onGoToShelf}
          disabled={editDisabled}
          listId="shelf-goto-canvas"
          className="editor-canvas-goto"
        />
        {zoomCategories.length > 0 ? (
          <select
            className="editor-canvas-select"
            defaultValue=""
            title="Zoom to category"
            onChange={(e) => {
              const v = e.target.value;
              e.target.value = "";
              if (v) onCategoryZoom(v);
            }}
          >
            <option value="">Category…</option>
            <option value="__selection__">Selection</option>
            {zoomCategories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name || c.id}
              </option>
            ))}
          </select>
        ) : null}
        {ctrlHeld ? (
          <span className="editor-canvas-layout-mode-hint muted" data-testid="shelf-layout-mode-hint">
            Ctrl held — click a shelf or aisle to select
          </span>
        ) : (
          <span className="editor-canvas-layout-mode-hint muted" data-testid="canvas-planogram-hint">
            Click shelf → planogram · Ctrl+click → select · click floor to deselect
          </span>
        )}
      </div>
      <div className="editor-canvas-bar-right">
        {!showShelfLabelHint ? null : (
          <span
            className="editor-canvas-label-hint muted"
            title="Shelf numbers appear when each fixture is large enough on screen"
          >
            Zoom in for shelf numbers
          </span>
        )}
        {layoutHasShelves && onOpenArrangement ? (
          <button
            type="button"
            className={`editor-canvas-chip${arrangementAccepted ? "" : " editor-canvas-chip--warn"}`}
            data-testid="arrangement-reopen"
            onClick={onOpenArrangement}
            title={
              arrangementAccepted
                ? "View layout summary (arrangement & volume)"
                : "Review and accept layout summary to unlock product allocation"
            }
          >
            {arrangementAccepted ? "Layout summary" : "Review summary"}
          </button>
        ) : null}
        <button type="button" className="editor-canvas-chip" onClick={onFitView}>
          Fit
        </button>
        <div className="editor-zoom-group">
          <button type="button" className="editor-canvas-icon" onClick={() => onZoomDelta(-0.25)} aria-label="Zoom out">
            −
          </button>
          <span className="mono editor-zoom-pct">{Math.round(zoom * 100)}%</span>
          <button type="button" className="editor-canvas-icon" onClick={() => onZoomDelta(0.25)} aria-label="Zoom in">
            +
          </button>
        </div>
      </div>
    </div>
  );
}
