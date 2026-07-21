import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "../api.js";
import { FIXTURE_TYPES, VERTICALS, ZONE_TYPES } from "../referenceCatalog.js";
import Scene3D from "../Scene3D.jsx";
import Palette from "./Palette.jsx";
import Canvas2D from "./Canvas2D.jsx";
import SmartGeneratePanel from "./SmartGeneratePanel.jsx";
import EditorSideRail from "./EditorSideRail.jsx";
import { mixForVertical, mixFromCategories, storeTypeForVertical } from "../storeTypes.js";
import { layoutCanvasBounds, pointInPolygon } from "./polygonCanvas.js";

const snap = (v) => Math.max(0, Math.round(v * 2) / 2);

export default function LayoutEditor({
  layout,
  setLayout,
  token,
  role,
  vertical,
  config,
  categories,
  products,
  toast,
  onBack,
  onRefreshLayouts,
  onDeleteLayout,
  statusMeta,
  onQuickAddProduct,
  onRefreshCatalog,
}) {
  const [view3d, setView3d] = useState(false);
  const [walkMode, setWalkMode] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [paletteTool, setPaletteTool] = useState("select");
  const [selection, setSelection] = useState(null);
  const [dragging, setDragging] = useState(null);
  const [dragPos, setDragPos] = useState(null);
  const [draftPolygon, setDraftPolygon] = useState([]);
  const [genOpen, setGenOpen] = useState(false);
  const [genOrientation, setGenOrientation] = useState("mixed");
  const [genMinAisle, setGenMinAisle] = useState("");
  const [categoryMix, setCategoryMix] = useState(() => mixForVertical(vertical));
  const [generating, setGenerating] = useState(false);
  const stageRef = useRef(null);

  const editDisabled = !["Designer", "Admin"].includes(role);
  const vMeta = VERTICALS[vertical] || VERTICALS.retail;
  const minAisle = config?.minAisleWidthMeters ?? vMeta.minAisle;

  const catSig = useMemo(() => (categories || []).map((c) => c.id).join("|"), [categories]);

  useEffect(() => {
    setCategoryMix(mixFromCategories(categories) || mixForVertical(vertical));
    setGenMinAisle(String(config?.minAisleWidthMeters ?? vMeta.minAisle));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layout?.id, vertical, catSig, config?.minAisleWidthMeters, vMeta.minAisle]);


  const canvasBounds = useMemo(
    () => (layout ? layoutCanvasBounds(layout) : { width: 10, height: 8 }),
    [layout]
  );

  const scale = useMemo(() => {
    if (!layout) return 24;
    return Math.min(48, 640 / Math.max(canvasBounds.width, canvasBounds.height, 1)) * zoom;
  }, [layout, canvasBounds, zoom]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el || view3d) return undefined;
    const onWheel = (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -0.15 : 0.15;
      setZoom((z) => Math.min(5, Math.max(0.5, Number((z + delta).toFixed(2)))));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [view3d]);

  useEffect(() => {
    if (!dragging) return undefined;
    const toPos = (clientX, clientY) => {
      const dx = (clientX - dragging.startClientX) / scale;
      const dy = (clientY - dragging.startClientY) / scale;
      return { x: Math.max(0, dragging.origX + dx), y: Math.max(0, dragging.origY + dy) };
    };
    const onMove = (e) => {
      const movedPx = Math.hypot(
        e.clientX - dragging.startClientX,
        e.clientY - dragging.startClientY
      );
      // Ignore micro-jitter so a plain click (select) doesn't visibly move the item.
      if (movedPx < 4) return;
      const { x, y } = toPos(e.clientX, e.clientY);
      setDragPos({ id: dragging.id, x, y });
    };
    const onUp = async (e) => {
      const movedPx = Math.hypot(
        e.clientX - dragging.startClientX,
        e.clientY - dragging.startClientY
      );
      const { x, y } = toPos(e.clientX, e.clientY);
      const nx = snap(x);
      const ny = snap(y);
      setDragging(null);
      setDragPos(null);
      // A click with no real movement is a pure selection — don't reposition/PATCH
      // (re-snapping could nudge an item outside the polygon and trigger a spurious
      // containment violation).
      if (movedPx < 4 || (nx === snap(dragging.origX) && ny === snap(dragging.origY))) {
        return;
      }
      try {
        const path =
          dragging.kind === "aisle"
            ? `/layouts/${dragging.layoutId}/aisles/${dragging.id}`
            : `/layouts/${dragging.layoutId}/shelves/${dragging.id}`;
        const updated = await api(path, {
          token,
          method: "PATCH",
          body: { x: nx, y: ny },
        });
        setLayout(updated);
      } catch (err) {
        toast(err.message);
      }
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [dragging, scale, token]);

  function placementAllowed(x, y) {
    const poly = canvasBounds.polygon;
    if (!poly) return true;
    return pointInPolygon(x, y, poly);
  }

  async function addShelf(type, x, y) {
    if (!placementAllowed(x, y)) {
      toast("Place shelves inside the drawn floor area only.");
      return;
    }
    const t = FIXTURE_TYPES[type] || FIXTURE_TYPES.shelf;
    const updated = await api(`/layouts/${layout.id}/shelves`, {
      token,
      method: "POST",
      body: {
        type: FIXTURE_TYPES[type] ? type : "shelf",
        usableWidthMeters: t.w,
        widthMeters: t.w,
        depthMeters: t.d,
        heightMeters: 2,
        x,
        y,
      },
    });
    setLayout(updated);
    setPaletteTool("select");
    toast(`${t.label} placed`);
  }

  async function addAisle(x = 0.5, y = 0.5) {
    if (!placementAllowed(x, y)) {
      toast("Place aisles inside the drawn floor area only.");
      return;
    }
    const updated = await api(`/layouts/${layout.id}/aisles`, {
      token,
      method: "POST",
      body: { name: "Aisle", widthMeters: Math.max(0.8, minAisle - 0.1), x, y },
    });
    setLayout(updated);
    setPaletteTool("select");
    toast("Aisle added");
  }

  async function addZone(type, x, y) {
    if (!placementAllowed(x, y)) {
      toast("Place zones inside the drawn floor area only.");
      return;
    }
    const meta = ZONE_TYPES[type] || ZONE_TYPES.special;
    try {
      const updated = await api(`/layouts/${layout.id}/zones`, {
        token,
        method: "POST",
        body: { type, x: snap(x), y: snap(y), widthMeters: 3, depthMeters: 3, color: meta.color },
      });
      setLayout(updated);
      setPaletteTool("select");
      toast(`${meta.label} added — resize in the Zones panel`);
    } catch (e) {
      toast(
        e.message === "containment_violation"
          ? "Zone must fit inside the drawn floor area."
          : e.message
      );
    }
  }

  async function addEntry(x, y) {
    if (!placementAllowed(x, y)) {
      toast("Place the entry point inside the drawn floor area.");
      return;
    }
    const updated = await api(`/layouts/${layout.id}/entry-points`, {
      token,
      method: "POST",
      body: { x: snap(x), y: snap(y), widthMeters: 1.8 },
    });
    setLayout(updated);
    setPaletteTool("select");
    toast("Entry point added");
  }

  async function dispatchPlace(tool, x, y) {
    if (tool === "aisle") return addAisle(x, y);
    if (tool === "entry") return addEntry(x, y);
    if (typeof tool === "string" && tool.startsWith("zone:")) {
      return addZone(tool.slice("zone:".length), x, y);
    }
    if (FIXTURE_TYPES[tool]) return addShelf(tool, x, y);
    return undefined;
  }

  async function onDropTool(tool, x, y) {
    try {
      await dispatchPlace(tool, x, y);
    } catch (e) {
      toast(e.message);
    }
  }

  async function onPlaceClick(tool, x, y) {
    try {
      await dispatchPlace(tool, x, y);
    } catch (e) {
      toast(e.message);
    }
  }

  async function patchLayout(body) {
    const updated = await api(`/layouts/${layout.id}`, { token, method: "PATCH", body });
    setLayout(updated);
    await onRefreshLayouts?.();
  }

  async function applyArea() {
    if (draftPolygon.length < 3) {
      toast("Need at least 3 vertices");
      return;
    }
    const xs = draftPolygon.map((p) => p.x);
    const ys = draftPolygon.map((p) => p.y);
    const widthMeters = Math.max(...xs) - Math.min(...xs) || layout.widthMeters;
    const depthMeters = Math.max(...ys) - Math.min(...ys) || layout.depthMeters;
    try {
      const updated = await api(`/layouts/${layout.id}`, {
        token,
        method: "PATCH",
        body: {
          shape: "polygon",
          polygon: draftPolygon,
          widthMeters: Math.max(widthMeters, 1),
          depthMeters: Math.max(depthMeters, 1),
        },
      });
      setLayout(updated);
      setDraftPolygon([]);
      setPaletteTool("select");
      toast("Floor area applied");
      await onRefreshLayouts?.();
    } catch (e) {
      toast(e.message);
    }
  }

  async function runGenerate() {
    const hasPolygon = layout.shape === "polygon" && (layout.polygon?.length ?? 0) >= 3;
    if (!hasPolygon) {
      toast("Draw and apply a floor area first (3+ vertices), then Generate.");
      setPaletteTool("draw");
      return;
    }
    const hasContent = (layout.aisles || []).length > 0 || (layout.shelves || []).length > 0;
    if (hasContent && !window.confirm("Replace existing aisles and shelves with generated layout?")) {
      return;
    }
    try {
      setGenerating(true);
      const mixPayload = categoryMix.map(({ categoryId, percent, temperatureZone }) => ({
        categoryId,
        percent,
        temperatureZone,
      }));
      const updated = await api(`/layouts/${layout.id}/autogenerate`, {
        token,
        method: "POST",
        body: {
          orientation: genOrientation,
          replaceExisting: true,
          minAisleWidthMeters: Number(genMinAisle) || minAisle,
          categoryMix: mixPayload,
        },
      });
      setLayout(updated);
      setGenOpen(false);
      const g = updated.generated || {};
      toast(
        `Generated ${g.shelves ?? 0} shelves · ${g.aisles ?? 0} aisles${g.skippedOutsideCount ? ` (${g.skippedOutsideCount} slots skipped outside area)` : ""}`
      );
    } catch (e) {
      toast(e.message);
    } finally {
      setGenerating(false);
    }
  }

  async function patchAisle(aisleId, body) {
    const updated = await api(`/layouts/${layout.id}/aisles/${aisleId}`, {
      token,
      method: "PATCH",
      body,
    });
    setLayout(updated);
  }

  async function patchShelf(shelfId, body) {
    const updated = await api(`/layouts/${layout.id}/shelves/${shelfId}`, {
      token,
      method: "PATCH",
      body,
    });
    setLayout(updated);
  }

  async function deleteAisle(aisleId) {
    const updated = await api(`/layouts/${layout.id}/aisles/${aisleId}`, { token, method: "DELETE" });
    setLayout(updated);
    setSelection(null);
  }

  async function deleteShelf(shelfId) {
    const updated = await api(`/layouts/${layout.id}/shelves/${shelfId}`, { token, method: "DELETE" });
    setLayout(updated);
    setSelection(null);
  }

  async function patchZone(zoneId, body) {
    const updated = await api(`/layouts/${layout.id}/zones/${zoneId}`, { token, method: "PATCH", body });
    setLayout(updated);
  }

  async function resizeEntity(kind, id, patch) {
    try {
      const path =
        kind === "zone"
          ? `/layouts/${layout.id}/zones/${id}`
          : `/layouts/${layout.id}/aisles/${id}`;
      const updated = await api(path, { token, method: "PATCH", body: patch });
      setLayout(updated);
    } catch (err) {
      toast(err.message);
    }
  }

  async function deleteZone(zoneId) {
    const updated = await api(`/layouts/${layout.id}/zones/${zoneId}`, { token, method: "DELETE" });
    setLayout(updated);
    setSelection(null);
  }

  async function patchEntry(entryId, body) {
    const updated = await api(`/layouts/${layout.id}/entry-points/${entryId}`, { token, method: "PATCH", body });
    setLayout(updated);
  }

  async function deleteEntry(entryId) {
    const updated = await api(`/layouts/${layout.id}/entry-points/${entryId}`, { token, method: "DELETE" });
    setLayout(updated);
    setSelection(null);
  }

  const selectionInfo = useMemo(() => {
    if (!selection) return null;
    const { kind, id } = selection;
    if (kind === "aisle") {
      const a = (layout.aisles || []).find((x) => x.id === id);
      return a ? { kind, id, label: a.name || "Aisle", run: () => deleteAisle(id) } : null;
    }
    if (kind === "shelf" || kind === "fixture") {
      const s = (layout.shelves || layout.fixtures || []).find((x) => x.id === id);
      const num = s?.displayNumber != null ? `#${s.displayNumber}` : "";
      return s ? { kind: "shelf", id, label: `Shelf ${num}`.trim(), run: () => deleteShelf(id) } : null;
    }
    if (kind === "zone") {
      const z = (layout.zones || []).find((x) => x.id === id);
      return z ? { kind, id, label: z.name || "Zone", run: () => deleteZone(id) } : null;
    }
    if (kind === "entryPoint") {
      const e = (layout.entryPoints || []).find((x) => x.id === id);
      return e ? { kind, id, label: e.name || "Entry point", run: () => deleteEntry(id) } : null;
    }
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selection, layout]);

  async function deleteSelection() {
    if (!selectionInfo || editDisabled) return;
    if (!window.confirm(`Delete ${selectionInfo.label}? This can't be undone.`)) return;
    try {
      await selectionInfo.run();
      toast(`${selectionInfo.label} deleted`);
    } catch (e) {
      toast(e.message);
    }
  }

  useEffect(() => {
    if (view3d || editDisabled) return undefined;
    const onKey = (e) => {
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      const el = document.activeElement;
      const tag = el?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el?.isContentEditable) return;
      if (!selectionInfo) return;
      e.preventDefault();
      deleteSelection();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view3d, editDisabled, selectionInfo]);

  async function mapAisle(aisleId, categoryId, color) {
    const updated = await api(`/layouts/${layout.id}/mappings`, {
      token,
      method: "POST",
      body: { aisleId, categoryId, color },
    });
    setLayout(updated);
  }

  async function mapShelf(shelfId, categoryId, color, faceId = "A") {
    const updated = await api(`/layouts/${layout.id}/mappings`, {
      token,
      method: "POST",
      body: { shelfId, categoryId, color, faceId },
    });
    setLayout(updated);
  }

  if (!layout) {
    return <p className="muted">Select a layout from Layouts, or create one with + New layout.</p>;
  }

  return (
    <section className="fade" style={{ display: "flex", flexDirection: "column", gap: 16, height: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <button className="btn-secondary" style={{ border: "none", background: "none", color: "#6b7280" }} onClick={onBack}>
            ← Layouts
          </button>
          <div style={{ fontSize: 19, fontWeight: 800 }}>{layout.name}</div>
          <span
            className="status-chip"
            style={{ background: statusMeta(layout.status).bg, color: statusMeta(layout.status).color }}
          >
            {statusMeta(layout.status).label}
          </span>
          <span className="catalog-vertical-badge">
            {storeTypeForVertical(vertical)?.emoji} {(VERTICALS[vertical] || VERTICALS.retail).label}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {role === "Approver" || role === "Admin" ? (
            <>
              <button
                className="btn-secondary"
                style={{ padding: "9px 14px", color: "#A30A2A", fontWeight: 700 }}
                onClick={() => patchLayout({ status: "rejected" }).then(() => toast("Layout rejected"))}
              >
                Reject
              </button>
              <button
                className="btn-primary"
                style={{ padding: "9px 14px", background: "oklch(0.5 0.12 150)", boxShadow: "none" }}
                onClick={() => patchLayout({ status: "approved" }).then(() => toast("Layout approved"))}
              >
                Approve
              </button>
            </>
          ) : null}
          {role === "Designer" || role === "Admin" ? (
            <button
              className="btn-secondary"
              style={{ padding: "9px 14px" }}
              onClick={() => patchLayout({ status: "in_review" }).then(() => toast("Submitted for review"))}
            >
              Submit review
            </button>
          ) : null}
          {(role === "Designer" || role === "Admin") && onDeleteLayout ? (
            <button
              className="btn-danger"
              style={{ padding: "9px 14px" }}
              onClick={() => onDeleteLayout(layout)}
            >
              Delete layout
            </button>
          ) : null}
          <div className="mode-toggle">
            <button
              className={!view3d ? "active" : ""}
              onClick={() => {
                setView3d(false);
                setWalkMode(false);
              }}
            >
              2D
            </button>
            <button className={view3d && !walkMode ? "active" : ""} onClick={() => { setView3d(true); setWalkMode(false); }}>
              3D Orbit
            </button>
            <button className={view3d && walkMode ? "active" : ""} onClick={() => { setView3d(true); setWalkMode(true); }}>
              Walk
            </button>
          </div>
        </div>
      </div>

      <div className="editor-layout">
        <Palette
          paletteTool={paletteTool}
          setPaletteTool={setPaletteTool}
          editDisabled={editDisabled}
          minAisle={minAisle}
          draftCount={draftPolygon.length}
          onApplyArea={() => applyArea()}
          onClearDraft={() => setDraftPolygon([])}
          onOpenGenerate={() => {
            if (layout.shape !== "polygon" || (layout.polygon?.length ?? 0) < 3) {
              toast("Draw floor area first: click vertices, then Apply area.");
              setPaletteTool("draw");
              return;
            }
            setGenOpen(true);
          }}
        />

        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10, minWidth: 0 }}>
          <div className="meter-bar">
            <div className="mono" style={{ fontSize: 13, fontWeight: 500 }}>
              {canvasBounds.strict
                ? `${canvasBounds.width.toFixed(1)} m × ${canvasBounds.height.toFixed(1)} m · fixture zone`
                : `${layout.widthMeters.toFixed(1)} m × ${layout.depthMeters.toFixed(1)} m`}
              {layout.shape === "polygon" ? " · polygon" : ""}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <span style={{ fontSize: 12, color: "#6b7280" }}>Max shelves</span>
              <span className="mono" style={{ fontSize: 16, fontWeight: 700, color: "#A30A2A" }}>
                {layout.autoCalc?.maxFixtures ?? "—"}
              </span>
              <div style={{ display: "flex", alignItems: "center", gap: 4, marginLeft: 10 }}>
                <button className="btn-secondary" style={{ width: 26, height: 26, padding: 0 }} onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.25).toFixed(2))))}>
                  –
                </button>
                <span className="mono" style={{ fontSize: 11, color: "#9aa1ab", width: 40, textAlign: "center" }}>
                  {Math.round(zoom * 100)}%
                </span>
                <button className="btn-secondary" style={{ width: 26, height: 26, padding: 0 }} onClick={() => setZoom((z) => Math.min(5, Number((z + 0.25).toFixed(2))))}>
                  +
                </button>
                <button
                  className="btn-secondary"
                  style={{ padding: "0 8px", height: 26, fontSize: 11 }}
                  onClick={() => setZoom(1)}
                  title="Reset zoom"
                >
                  Reset
                </button>
              </div>
              <button
                className="btn-secondary"
                style={{ padding: "6px 10px", fontSize: 12 }}
                disabled={editDisabled}
                onClick={() => patchLayout({ widthMeters: layout.widthMeters + 2 }).then(() => toast("Dimensions updated"))}
              >
                Grow +2m
              </button>
            </div>
          </div>

          {(layout.validation?.aisleViolations || []).map((text) => (
            <div key={text} className="violation">
              <span className="bang">!</span>
              <span>{text}</span>
            </div>
          ))}
          {(layout.validation?.containmentViolations || []).length > 0 ? (
            <div className="violation">
              <span className="bang">!</span>
              <span>
                {(layout.validation.containmentViolations || []).length} item(s) outside floor area
              </span>
            </div>
          ) : null}
          {!view3d && paletteTool === "draw" ? (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                background: "rgba(14,165,233,0.08)",
                border: "1px solid rgba(14,165,233,0.25)",
                fontSize: 12.5,
                color: "#0369a1",
              }}
            >
              Click the canvas to add vertices · need 3+ points · then <strong>Apply area</strong> · use{" "}
              <strong>Generate</strong> for aisles & shelves
            </div>
          ) : null}
          {!view3d && layout.shape !== "polygon" && !editDisabled ? (
            <div className="muted" style={{ fontSize: 12, padding: "0 2px" }}>
              Tip: use <strong>Draw area</strong> to define an irregular store shape before Generate.
            </div>
          ) : null}

          {genOpen ? (
            <SmartGeneratePanel
              open={genOpen}
              onClose={() => setGenOpen(false)}
              minAisleWidth={genMinAisle}
              onMinAisleWidthChange={setGenMinAisle}
              orientation={genOrientation}
              onOrientationChange={setGenOrientation}
              categoryMix={categoryMix}
              onCategoryMixChange={setCategoryMix}
              onGenerate={() => runGenerate()}
              generating={generating}
              disabled={editDisabled}
            />
          ) : null}

          {!view3d && selectionInfo ? (
            <div className="selection-bar">
              <span className="selection-bar-kind">{selectionInfo.kind}</span>
              <span className="selection-bar-label">{selectionInfo.label}</span>
              <span className="selection-bar-hint">Press Del to remove</span>
              <div style={{ flex: 1 }} />
              <button
                type="button"
                className="btn-secondary"
                style={{ padding: "6px 12px", fontSize: 12 }}
                onClick={() => setSelection(null)}
              >
                Deselect
              </button>
              <button
                type="button"
                className="btn-danger"
                style={{ padding: "6px 12px", fontSize: 12 }}
                disabled={editDisabled}
                onClick={() => deleteSelection()}
              >
                Delete
              </button>
            </div>
          ) : null}

          <div className="canvas-stage" ref={stageRef}>
            {view3d ? (
              <div style={{ width: "100%", height: "100%", minHeight: 420 }}>
                <Scene3D layout={layout} products={products} walkMode={walkMode} />
                {walkMode ? (
                  <div className="muted" style={{ fontSize: 12, marginTop: 8, textAlign: "center" }}>
                    Click canvas · WASD move · mouse look · Esc release pointer
                  </div>
                ) : (
                  <div className="muted" style={{ fontSize: 12, marginTop: 8, textAlign: "center" }}>
                    Scroll zoom · drag orbit · right-drag pan
                  </div>
                )}
              </div>
            ) : (
              <Canvas2D
                layout={layout}
                scale={scale}
                selection={selection}
                setSelection={setSelection}
                paletteTool={paletteTool}
                editDisabled={editDisabled}
                dragPos={dragPos}
                setDragging={setDragging}
                onDropTool={onDropTool}
                onPlaceClick={onPlaceClick}
                onResize={resizeEntity}
                draftPolygon={draftPolygon}
                onDrawVertex={(x, y) => setDraftPolygon((pts) => [...pts, { x, y }])}
              />
            )}
          </div>
        </div>

        <EditorSideRail
          selection={selection}
          layout={layout}
          editDisabled={editDisabled}
          minAisle={minAisle}
          verticalLabel={vMeta.label}
          categories={categories}
          products={products}
          token={token}
          onPatchAisle={(id, body) => patchAisle(id, body).catch((e) => toast(e.message))}
          onPatchShelf={(id, body) => patchShelf(id, body).catch((e) => toast(e.message))}
          onDeleteAisle={() => deleteSelection()}
          onDeleteShelf={() => deleteSelection()}
          onMapAisle={(id, cat, color) => mapAisle(id, cat, color).catch((e) => toast(e.message))}
          onMapShelf={(id, cat, color) => mapShelf(id, cat, color).catch((e) => toast(e.message))}
          onLayoutUpdated={setLayout}
          onQuickAddProduct={onQuickAddProduct}
          onPatchZone={(id, body) => patchZone(id, body).catch((e) => toast(e.message))}
          onDeleteZone={(id) => deleteZone(id).catch((e) => toast(e.message))}
          onPatchEntry={(id, body) => patchEntry(id, body).catch((e) => toast(e.message))}
          onDeleteEntry={(id) => deleteEntry(id).catch((e) => toast(e.message))}
          onRefreshCatalog={onRefreshCatalog}
          toast={toast}
        />
      </div>
    </section>
  );
}
