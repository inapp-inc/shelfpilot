import ShelfGotoInput from "./ShelfGotoInput.jsx";

/** Compact strip above the canvas — dimensions, capacity, navigation, zoom. */
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
  onDrawArea,
}) {
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
  const modeHint = ctrlHeld
    ? "Ctrl held — click a shelf or aisle to select"
    : "Click shelf → planogram · Ctrl+click → select · click floor to deselect";

  return (
    <div className="editor-canvas-bar">
      <div className="editor-canvas-bar-left">
        <div className="editor-canvas-bar-group editor-dims-inline-group">
          <span
            className="editor-dims-tag"
            title="Store outline — the overall building boundary (metres). Changes save with the layout."
          >
            Store
          </span>
          <label className="editor-dims-inline" title="Store length (m)">
            <input
              className="mono"
              type="number"
              step="0.5"
              min="1"
              disabled={editDisabled}
              value={storeW}
              aria-label="Store length metres"
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
              aria-label="Store width metres"
              onChange={(e) => {
                onStoreDChange(e.target.value);
                onEnvelopePatch(storeW, e.target.value);
              }}
            />
            <span className="editor-dims-unit">m</span>
          </label>

          <span
            className="editor-dims-tag"
            title="Fixture zone — where shelves may be placed inside the store. Changes save with the layout."
          >
            Zone
          </span>
          <label className="editor-dims-inline" title="Fixture zone size (m)">
            <input
              className="mono"
              type="number"
              step="0.5"
              min="0.5"
              max={envelope ? envelope.widthMeters : undefined}
              disabled={editDisabled}
              value={fixtureW}
              aria-label="Fixture zone length metres"
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
              aria-label="Fixture zone depth metres"
              onChange={(e) => {
                onFixtureDChange(e.target.value);
                onFixturePatch(fixtureW, e.target.value);
              }}
            />
            <span className="editor-dims-unit">m</span>
          </label>

          {hasPolygon ? (
            <button
              type="button"
              className="editor-canvas-chip"
              disabled={editDisabled}
              onClick={onGrowStore}
              title="Expand store envelope by 2 m on each side"
            >
              +2m
            </button>
          ) : null}
          <button
            type="button"
            className="editor-canvas-chip"
            disabled={editDisabled}
            onClick={onDrawArea}
            title="Draw a custom fixture zone polygon on the floor"
          >
            Draw shape
          </button>
        </div>

        <div className="editor-canvas-bar-divider" aria-hidden />

        <div className="editor-canvas-bar-group">
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
        </div>

        <div className="editor-canvas-bar-divider" aria-hidden />

        <div className="editor-canvas-bar-group">
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
          <span
            className="editor-canvas-mode-icon"
            data-testid={ctrlHeld ? "shelf-layout-mode-hint" : "canvas-planogram-hint"}
            title={modeHint}
            aria-label={modeHint}
          >
            ⓘ
          </span>
        </div>
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
