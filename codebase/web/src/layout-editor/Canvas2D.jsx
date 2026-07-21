import { useEffect, useMemo, useRef, useState } from "react";
import { FIXTURE_TYPES, ZONE_TYPES } from "../referenceCatalog.js";
import ShelfBadge from "./ShelfBadge.jsx";
import {
  entityFitsPolygon,
  entityPlacementValid,
  fromStageCoords,
  layoutCanvasBounds,
  pointInPolygon,
  shelfFitsPolygon,
  shelfLocalMeters,
  toStageCoords,
} from "./polygonCanvas.js";

const snap = (v) => Math.max(0, Math.round(v * 2) / 2);

const EDGE_HIT_PX = 8;

function hitTestResizeEdge(e, el) {
  const rect = el.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const onN = y <= EDGE_HIT_PX;
  const onS = y >= rect.height - EDGE_HIT_PX;
  const onW = x <= EDGE_HIT_PX;
  const onE = x >= rect.width - EDGE_HIT_PX;
  if (!onN && !onS && !onW && !onE) return null;
  let dir = "";
  if (onN) dir += "n";
  if (onS) dir += "s";
  if (onW) dir += "w";
  if (onE) dir += "e";
  return dir || null;
}

function edgeCursor(dir) {
  if (dir === "n" || dir === "s") return "ns-resize";
  if (dir === "e" || dir === "w") return "ew-resize";
  if (dir === "nw" || dir === "se") return "nwse-resize";
  if (dir === "ne" || dir === "sw") return "nesw-resize";
  return "default";
}

const HANDLE_DIRS = [
  ["nw", { left: -5, top: -5, cursor: "nwse-resize" }],
  ["n", { left: "calc(50% - 5px)", top: -5, cursor: "ns-resize" }],
  ["ne", { right: -5, top: -5, cursor: "nesw-resize" }],
  ["e", { right: -5, top: "calc(50% - 5px)", cursor: "ew-resize" }],
  ["se", { right: -5, bottom: -5, cursor: "nwse-resize" }],
  ["s", { left: "calc(50% - 5px)", bottom: -5, cursor: "ns-resize" }],
  ["sw", { left: -5, bottom: -5, cursor: "nesw-resize" }],
  ["w", { left: -5, top: "calc(50% - 5px)", cursor: "ew-resize" }],
];

/** 8 resize grips rendered as children of a selected, absolutely-positioned entity. */
function ResizeHandles({ onStart }) {
  return HANDLE_DIRS.map(([dir, style]) => (
    <div
      key={dir}
      className="resize-handle"
      style={{ position: "absolute", ...style }}
      onMouseDown={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onStart(dir, e);
      }}
      onClick={(e) => e.stopPropagation()}
    />
  ));
}

/** Any tool that drops something onto the floor (fixtures, aisle, zones, entry). */
function isPlacerTool(tool) {
  return (
    !!FIXTURE_TYPES[tool] ||
    tool === "aisle" ||
    tool === "entry" ||
    (typeof tool === "string" && tool.startsWith("zone:"))
  );
}

function shelfDrawSize(shelf) {
  return shelfLocalMeters(shelf);
}

function normalizeDeg(deg) {
  return ((Number(deg) || 0) % 360 + 360) % 360;
}

function snapDeg(deg, shiftKey) {
  const n = normalizeDeg(deg);
  if (!shiftKey) return Math.round(n);
  return Math.round(n / 15) * 15;
}

/**
 * 2D floor canvas: DnD, draw polygon area, aisle + shelf layers.
 * Strict mode: viewport = polygon AABB; fixtures only inside drawn zone.
 */
export default function Canvas2D({
  layout,
  scale,
  selection,
  setSelection,
  paletteTool,
  editDisabled,
  dragPos,
  setDragging,
  onDropTool,
  onPlaceClick,
  onResize,
  onRotateShelf,
  onWheelZoom,
  categories,
  draftPolygon,
  onDrawVertex,
  onDraftPolygonChange,
  onPolygonChange,
}) {
  const floorRef = useRef(null);
  const bounds = layoutCanvasBounds(layout);
  const shelves = layout.shelves?.length ? layout.shelves : layout.fixtures || [];
  const outsideIds = new Set(
    (layout.validation?.containmentViolations || []).map((v) => `${v.kind}:${v.id}`)
  );
  const drawing = paletteTool === "draw";
  const editingArea = paletteTool === "edit-area";
  const poly = bounds.polygon;
  const envelope = bounds.storeEnvelope;
  const hasBoundaries = Boolean(poly?.length >= 3 && envelope);

  const visibleShelves = useMemo(() => {
    if (!poly) return shelves;
    return shelves.filter((s) => shelfFitsPolygon(s, poly));
  }, [shelves, poly]);

  function layoutPointFromEvent(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const sx = snap((e.clientX - rect.left) / scale);
    const sy = snap((e.clientY - rect.top) / scale);
    return fromStageCoords(sx, sy, bounds);
  }

  function insideZone(x, y) {
    if (!poly) return true;
    return pointInPolygon(x, y, poly);
  }

  // ---- Resize gesture (zones + aisles) ----
  const [resize, setResize] = useState(null);
  const [resizePreview, setResizePreview] = useState(null);
  const [rotate, setRotate] = useState(null);
  const [rotatePreview, setRotatePreview] = useState(null);
  const [vertexDrag, setVertexDrag] = useState(null);
  const [draftDrag, setDraftDrag] = useState(null);
  const resizeRef = useRef(null);
  const previewRef = useRef(null);
  const rotateRef = useRef(null);
  const rotatePreviewRef = useRef(null);
  resizeRef.current = resize;
  previewRef.current = resizePreview;
  rotateRef.current = rotate;
  rotatePreviewRef.current = rotatePreview;

  function rectFits(x, y, w, h) {
    if (poly) {
      const pts = [
        [x, y],
        [x + w, y],
        [x, y + h],
        [x + w, y + h],
        [x + w / 2, y],
        [x + w / 2, y + h],
        [x, y + h / 2],
        [x + w, y + h / 2],
      ];
      return pts.every(([px, py]) => pointInPolygon(px, py, poly));
    }
    const eps = 1e-6;
    return (
      x >= bounds.minX - eps &&
      y >= bounds.minY - eps &&
      x + w <= bounds.minX + bounds.width + eps &&
      y + h <= bounds.minY + bounds.height + eps
    );
  }

  function startResize(spec, dir, e) {
    setResizePreview(null);
    previewRef.current = null;
    setResize({ ...spec, dir, startX: e.clientX, startY: e.clientY });
  }

  useEffect(() => {
    if (!resize) return undefined;
    const onMove = (e) => {
      const r = resizeRef.current;
      if (!r) return;
      const dx = (e.clientX - r.startX) / scale;
      const dy = (e.clientY - r.startY) / scale;
      let { x, y, w, h } = r.orig;
      const dir = r.dir;
      if (dir.includes("w")) {
        x = r.orig.x + dx;
        w = r.orig.w - dx;
      }
      if (dir.includes("e")) w = r.orig.w + dx;
      if (dir.includes("n")) {
        y = r.orig.y + dy;
        h = r.orig.h - dy;
      }
      if (dir.includes("s")) h = r.orig.h + dy;

      if (w < r.min.w) {
        if (dir.includes("w")) x = r.orig.x + (r.orig.w - r.min.w);
        w = r.min.w;
      }
      if (h < r.min.h) {
        if (dir.includes("n")) y = r.orig.y + (r.orig.h - r.min.h);
        h = r.min.h;
      }
      x = snap(x);
      y = snap(y);
      w = Math.max(r.min.w, snap(w));
      h = Math.max(r.min.h, snap(h));
      if (!rectFits(x, y, w, h)) return;
      if (r.kind === "aisle") {
        const tentative =
          r.orientation === "vertical"
            ? { id: r.id, x, y, widthMeters: w, lengthMeters: h, orientation: "vertical" }
            : { id: r.id, x, y, widthMeters: h, lengthMeters: w, orientation: "horizontal" };
        if (!entityPlacementValid(tentative, "aisle", bounds, layout, { ignoreId: r.id })) return;
      }
      const next = { id: r.id, x, y, w, h };
      previewRef.current = next;
      setResizePreview(next);
    };
    const onUp = () => {
      const r = resizeRef.current;
      const pv = previewRef.current;
      if (r && pv && pv.id === r.id && onResize) {
        let patch;
        if (r.kind === "zone") {
          patch = { x: pv.x, y: pv.y, widthMeters: pv.w, depthMeters: pv.h };
        } else if (r.orientation === "vertical") {
          patch = { x: pv.x, y: pv.y, widthMeters: pv.w, lengthMeters: pv.h };
        } else {
          patch = { x: pv.x, y: pv.y, widthMeters: pv.h, lengthMeters: pv.w };
        }
        onResize(r.kind, r.id, patch);
      }
      setResize(null);
      setResizePreview(null);
      previewRef.current = null;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resize, scale]);

  useEffect(() => {
    if (!rotate) return undefined;
    const onMove = (e) => {
      const r = rotateRef.current;
      if (!r) return;
      const angle = Math.atan2(e.clientY - r.cy, e.clientX - r.cx) * (180 / Math.PI);
      const delta = angle - r.startAngle;
      const next = snapDeg(r.origDeg + delta, e.shiftKey);
      rotatePreviewRef.current = next;
      setRotatePreview(next);
    };
    const onUp = (e) => {
      const r = rotateRef.current;
      const deg = rotatePreviewRef.current;
      if (r && deg != null && onRotateShelf) onRotateShelf(r.id, deg);
      setRotate(null);
      setRotatePreview(null);
      rotatePreviewRef.current = null;
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rotate]);

  useEffect(() => {
    if (!vertexDrag) return undefined;
    const onMove = (e) => {
      const rect = vertexDrag.rect;
      const sx = snap((e.clientX - rect.left) / scale);
      const sy = snap((e.clientY - rect.top) / scale);
      const { x, y } = fromStageCoords(sx, sy, bounds);
      const next = vertexDrag.vertices.map((p, i) =>
        i === vertexDrag.index ? { x: Math.max(0, x), y: Math.max(0, y) } : p
      );
      setVertexDrag((v) => (v ? { ...v, preview: next } : v));
    };
    const onUp = () => {
      const preview = vertexDrag.preview;
      setVertexDrag(null);
      if (preview?.length >= 3) onPolygonChange?.(preview);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vertexDrag, scale, bounds]);

  useEffect(() => {
    if (!draftDrag) return undefined;
    const onMove = (e) => {
      const rect = draftDrag.rect;
      const sx = snap((e.clientX - rect.left) / scale);
      const sy = snap((e.clientY - rect.top) / scale);
      const { x, y } = fromStageCoords(sx, sy, bounds);
      const next = draftDrag.vertices.map((p, i) =>
        i === draftDrag.index ? { x: Math.max(0, x), y: Math.max(0, y) } : p
      );
      setDraftDrag((v) => (v ? { ...v, preview: next } : v));
    };
    const onUp = () => {
      const preview = draftDrag.preview;
      setDraftDrag(null);
      if (preview?.length >= 1) onDraftPolygonChange?.(preview);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftDrag, scale, bounds]);

  useEffect(() => {
    const el = floorRef.current;
    if (!el || !onWheelZoom) return undefined;
    const onWheel = (e) => onWheelZoom(e);
    el.addEventListener("wheel", onWheel, { passive: false, capture: true });
    return () => el.removeEventListener("wheel", onWheel, { capture: true });
  }, [onWheelZoom]);

  const showHandles = !editDisabled && !drawing && !editingArea;
  const editVertices = vertexDrag?.preview || poly;
  const draftVertices = draftDrag?.preview || draftPolygon;

  return (
    <div
      ref={floorRef}
      className="floor-plan floor-plan-strict"
      style={{
        width: bounds.width * scale,
        height: bounds.height * scale,
        backgroundSize: `${scale}px ${scale}px`,
        background: hasBoundaries ? "transparent" : undefined,
        backgroundImage: hasBoundaries ? "none" : undefined,
        border: hasBoundaries ? "none" : undefined,
        cursor: drawing || editingArea || isPlacerTool(paletteTool) ? "crosshair" : "default",
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
      }}
      onDrop={(e) => {
        e.preventDefault();
        if (editDisabled || drawing) return;
        const tool = e.dataTransfer.getData("application/x-shelfpilot-tool");
        if (!tool) return;
        const { x, y } = layoutPointFromEvent(e);
        if (!insideZone(x, y)) return;
        onDropTool(tool, x, y);
      }}
      onMouseDown={(e) => {
        // Deselect only when pressing directly on the empty floor. Entity mousedowns
        // stopPropagation, so a shelf/aisle stays selected even if the mouse is
        // released just off it onto the floor (fixes "select then instantly deselect").
        if (e.target !== e.currentTarget) return;
        if (drawing) return;
        if (editingArea) return;
        if (paletteTool === "select" || editDisabled) setSelection(null);
      }}
      onClick={(e) => {
        // Placement / vertex drawing happens on a click of the empty floor itself.
        // (Deselection is handled on mousedown above — never here — so a click that
        // lands on the floor after pressing a shelf doesn't wipe the selection.)
        if (e.target !== e.currentTarget) return;
        if (editDisabled) return;
        const { x, y } = layoutPointFromEvent(e);
        if (drawing) {
          onDrawVertex?.(x, y);
          return;
        }
        if (paletteTool === "select") return;
        if (!isPlacerTool(paletteTool)) return;
        if (!insideZone(x, y)) return;
        onPlaceClick(paletteTool, x, y);
      }}
    >
      {hasBoundaries || draftPolygon?.length ? (
        <svg
          width={bounds.width * scale}
          height={bounds.height * scale}
          className="store-envelope-layer"
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: editingArea ? "auto" : "none",
            zIndex: 0,
          }}
        >
          {hasBoundaries ? (
            <>
              <defs>
                <pattern
                  id={`fixture-grid-${layout.id}`}
                  width={scale}
                  height={scale}
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d={`M ${scale} 0 L 0 0 0 ${scale}`}
                    fill="none"
                    stroke="#e5e7eb"
                    strokeWidth="1"
                  />
                </pattern>
              </defs>
              <rect
                className="store-envelope-rect"
                x={(envelope.x - bounds.minX) * scale}
                y={(envelope.y - bounds.minY) * scale}
                width={envelope.widthMeters * scale}
                height={envelope.depthMeters * scale}
              />
              <polygon
                className="fixture-zone-poly"
                points={poly
                  .map((p) => {
                    const st = toStageCoords(p.x, p.y, bounds);
                    return `${st.x * scale},${st.y * scale}`;
                  })
                  .join(" ")}
              />
              <polygon
                className="fixture-zone-grid"
                points={poly
                  .map((p) => {
                    const st = toStageCoords(p.x, p.y, bounds);
                    return `${st.x * scale},${st.y * scale}`;
                  })
                  .join(" ")}
                fill={`url(#fixture-grid-${layout.id})`}
                stroke="none"
              />
            </>
          ) : null}
          {editingArea && editVertices?.length
            ? editVertices.map((p, i) => {
                const st = toStageCoords(p.x, p.y, bounds);
                return (
                  <circle
                    key={i}
                    className="polygon-vertex-handle"
                    cx={st.x * scale}
                    cy={st.y * scale}
                    r="6"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      const rect = e.currentTarget.closest(".floor-plan")?.getBoundingClientRect();
                      if (!rect) return;
                      setVertexDrag({
                        index: i,
                        vertices: editVertices.map((v) => ({ ...v })),
                        preview: editVertices.map((v) => ({ ...v })),
                        rect,
                      });
                    }}
                  />
                );
              })
            : null}
          {draftPolygon?.length ? (
            <>
              <polyline
                points={draftVertices
                  .map((p) => {
                    const st = toStageCoords(p.x, p.y, bounds);
                    return `${st.x * scale},${st.y * scale}`;
                  })
                  .join(" ")}
                fill="none"
                stroke="#0ea5e9"
                strokeWidth="3"
              />
              {draftVertices.map((p, i) => {
                const st = toStageCoords(p.x, p.y, bounds);
                return (
                  <circle
                    key={`draft-${i}`}
                    className="polygon-vertex-handle draft-vertex-handle"
                    cx={st.x * scale}
                    cy={st.y * scale}
                    r="7"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      const rect = e.currentTarget.closest(".floor-plan")?.getBoundingClientRect();
                      if (!rect) return;
                      setDraftDrag({
                        index: i,
                        vertices: draftVertices.map((v) => ({ ...v })),
                        preview: draftVertices.map((v) => ({ ...v })),
                        rect,
                      });
                    }}
                  />
                );
              })}
            </>
          ) : null}
        </svg>
      ) : null}

      {(layout.zones || []).map((z) => {
        const meta = ZONE_TYPES[z.type] || ZONE_TYPES.special;
        const color = z.color || meta.color;
        const selected = selection?.kind === "zone" && selection.id === z.id;
        const pv = resizePreview && resizePreview.id === z.id ? resizePreview : null;
        const zx = pv ? pv.x : z.x || 0;
        const zy = pv ? pv.y : z.y || 0;
        const zw = pv ? pv.w : z.widthMeters || 1;
        const zh = pv ? pv.h : z.depthMeters || 1;
        const st = toStageCoords(zx, zy, bounds);
        return (
          <div
            key={z.id}
            className={`zone ${selected ? "selected" : ""}`}
            style={{
              left: st.x * scale,
              top: st.y * scale,
              width: Math.max(20, zw * scale),
              height: Math.max(16, zh * scale),
              background: `${color}22`,
              border: `1.5px dashed ${color}`,
              boxShadow: selected ? `0 0 0 3px ${color}55` : "none",
              zIndex: selected ? 8 : 0,
              cursor: editDisabled || drawing ? "default" : selected ? "move" : "pointer",
            }}
            onMouseMove={(e) => {
              if (!selected || editDisabled || drawing || paletteTool !== "select") return;
              const dir = hitTestResizeEdge(e, e.currentTarget);
              e.currentTarget.style.cursor = dir ? edgeCursor(dir) : "move";
            }}
            onMouseLeave={(e) => {
              if (selected && !editDisabled) e.currentTarget.style.cursor = "move";
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              if (drawing) return;
              setSelection({ kind: "zone", id: z.id });
              if (editDisabled || paletteTool !== "select") return;
              const dir = hitTestResizeEdge(e, e.currentTarget);
              if (dir && showHandles) {
                startResize(
                  {
                    kind: "zone",
                    id: z.id,
                    orientation: null,
                    orig: { x: z.x || 0, y: z.y || 0, w: z.widthMeters || 1, h: z.depthMeters || 1 },
                    min: { w: 1, h: 1 },
                  },
                  dir,
                  e
                );
              }
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <span className="zone-badge" style={{ background: color }}>
              {z.name || meta.label}
            </span>
            {selected && showHandles ? (
              <ResizeHandles
                onStart={(dir, e) =>
                  startResize(
                    {
                      kind: "zone",
                      id: z.id,
                      orientation: null,
                      orig: { x: z.x || 0, y: z.y || 0, w: z.widthMeters || 1, h: z.depthMeters || 1 },
                      min: { w: 1, h: 1 },
                    },
                    dir,
                    e
                  )
                }
              />
            ) : null}
          </div>
        );
      })}

      {(layout.aisles || []).map((a, idx) => {
        const bad =
          (a.violations || []).length > 0 ||
          (layout.validation?.containmentViolations || []).some((v) => v.kind === "aisle" && v.id === a.id);
        const selected = selection?.kind === "aisle" && selection.id === a.id;
        const ax = a.x != null ? a.x : 0.3;
        const ay = a.y != null ? a.y : 0.3 + idx * 1.2;
        const st = toStageCoords(ax, ay, bounds);
        const vertical = a.orientation === "vertical";
        const runLen =
          a.lengthMeters != null ? a.lengthMeters : Math.max(2, layout.widthMeters * 0.35);
        const baseW = vertical ? a.widthMeters : runLen;
        const baseH = vertical ? runLen : a.widthMeters;
        const pv = resizePreview && resizePreview.id === a.id ? resizePreview : null;
        const drawX = pv ? pv.x : ax;
        const drawY = pv ? pv.y : ay;
        const wMeters = pv ? pv.w : baseW;
        const hMeters = pv ? pv.h : baseH;
        const stA = pv ? toStageCoords(drawX, drawY, bounds) : st;
        return (
          <div
            key={a.id}
            className={`aisle ${bad ? "bad" : ""} ${vertical ? "aisle-vertical" : ""}`}
            title={`${a.name || "Aisle"} · ${Number(a.widthMeters || 0).toFixed(1)} m wide`}
            style={{
              left: stA.x * scale,
              top: stA.y * scale,
              width: Math.max(20, wMeters * scale),
              height: Math.max(16, hMeters * scale),
              background: a.color
                ? `${a.color}2b`
                : bad
                  ? "rgba(163,10,42,0.12)"
                  : "rgba(148,163,184,0.32)",
              boxShadow: selected ? "0 0 0 3px rgba(31,41,51,0.28)" : "none",
              cursor: editDisabled || drawing ? "default" : "grab",
              // Aisles sit above zones but below shelves, so shelves in an aisle run
              // stay selectable even when the aisle is the current selection.
              zIndex: selected ? 3 : 1,
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              if (drawing) return;
              setSelection({ kind: "aisle", id: a.id });
              if (editDisabled || paletteTool !== "select") return;
              setDragging({
                kind: "aisle",
                id: a.id,
                layoutId: layout.id,
                startClientX: e.clientX,
                startClientY: e.clientY,
                origX: ax,
                origY: ay,
              });
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {bad ? <span className="bang">!</span> : null}
            <span className="aisle-label mono">{a.name || "Aisle"}</span>
            <span className="aisle-dim mono">
              {wMeters.toFixed(1)}×{Number(a.widthMeters || 0).toFixed(1)} m
            </span>
            {selected && showHandles ? (
              <ResizeHandles
                onStart={(dir, e) =>
                  startResize(
                    {
                      kind: "aisle",
                      id: a.id,
                      orientation: a.orientation,
                      orig: { x: ax, y: ay, w: baseW, h: baseH },
                      min: vertical ? { w: 0.8, h: 1 } : { w: 1, h: 0.8 },
                    },
                    dir,
                    e
                  )
                }
              />
            ) : null}
          </div>
        );
      })}

      {visibleShelves.map((f) => {
        const live = dragPos && dragPos.id === f.id ? dragPos : f;
        const selected =
          (selection?.kind === "shelf" || selection?.kind === "fixture") && selection.id === f.id;
        const outside = outsideIds.has(`shelf:${f.id}`);
        const { w, d } = shelfDrawSize(live);
        const st = toStageCoords(live.x, live.y, bounds);
        const rot = rotatePreview != null && rotate?.id === f.id ? rotatePreview : normalizeDeg(live.rotationDeg);
        const zone = f.temperatureZone || "ambient";
        const zoneClass =
          zone === "chilled" ? "shelf-chilled" : zone === "frozen" ? "shelf-frozen" : "";
        const faceA = f.faces?.find((face) => face.id === "A");
        const fillColor =
          f.doubleSided && faceA?.color
            ? `${faceA.color}33`
            : f.color || (zone === "chilled" ? "rgba(14,165,233,0.18)" : zone === "frozen" ? "rgba(56,189,248,0.22)" : "rgba(163,10,42,0.12)");
        const segments = f.segments || [];
        const usable = w;
        return (
          <div
            key={f.id}
            className={`fx ${zoneClass} ${outside ? "fx-violation" : ""}`}
            style={{
              left: st.x * scale,
              top: st.y * scale,
              width: w * scale,
              height: d * scale,
              background: fillColor,
              borderColor: outside
                ? "#dc2626"
                : selected
                  ? "#A30A2A"
                  : zone === "chilled"
                    ? "#0ea5e9"
                    : zone === "frozen"
                      ? "#38bdf8"
                      : "#1f2933",
              boxShadow: selected ? "0 0 0 3px rgba(163,10,42,0.25)" : "none",
              cursor: editDisabled || drawing || paletteTool !== "select" ? "pointer" : "grab",
              zIndex: selected ? 6 : 5,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: selected ? "visible" : "hidden",
              transform: `rotate(${rot}deg)`,
              transformOrigin: "top left",
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              if (drawing) return;
              setSelection({ kind: "shelf", id: f.id });
              if (editDisabled || paletteTool !== "select") return;
              setDragging({
                kind: "shelf",
                id: f.id,
                layoutId: layout.id,
                startClientX: e.clientX,
                startClientY: e.clientY,
                origX: f.x,
                origY: f.y,
              });
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {selected && segments.length > 1
              ? segments.map((seg, idx) => {
                  const leftPct = (seg.offsetMeters / usable) * 100;
                  const widthPct = (seg.widthMeters / usable) * 100;
                  return (
                    <div
                      key={seg.id}
                      className={seg.fillMode === "partial" ? "segment-partial" : ""}
                      style={{
                        position: "absolute",
                        left: `${leftPct}%`,
                        top: 0,
                        width: `${widthPct}%`,
                        height: "100%",
                        borderLeft: idx > 0 ? "1px dashed rgba(31,41,51,0.35)" : "none",
                        pointerEvents: "none",
                        background:
                          seg.fillMode === "partial"
                            ? "repeating-linear-gradient(135deg, rgba(148,163,184,0.12) 0, rgba(148,163,184,0.12) 4px, transparent 4px, transparent 8px)"
                            : "transparent",
                      }}
                    />
                  );
                })
              : null}
            {selected ? (
              <span className="fixture-dim mono">
                {w.toFixed(1)}×{d.toFixed(1)} m
              </span>
            ) : null}
            <ShelfBadge shelf={f} pixelWidth={w * scale} categories={categories} />
            {selected && showHandles && onRotateShelf ? (
              <div
                className="rotate-handle"
                title="Drag to rotate · Shift = 15° snap"
                onMouseDown={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  const rect = e.currentTarget.parentElement.getBoundingClientRect();
                  const cx = rect.left + rect.width / 2;
                  const cy = rect.top + rect.height / 2;
                  setRotatePreview(null);
                  rotatePreviewRef.current = null;
                  setRotate({
                    id: f.id,
                    origDeg: normalizeDeg(f.rotationDeg),
                    startAngle: Math.atan2(e.clientY - cy, e.clientX - cx) * (180 / Math.PI),
                    cx,
                    cy,
                  });
                }}
              />
            ) : null}
          </div>
        );
      })}

      {(layout.entryPoints || []).map((ep) => {
        const selected = selection?.kind === "entryPoint" && selection.id === ep.id;
        const st = toStageCoords(ep.x || 0, ep.y || 0, bounds);
        const size = Math.max(22, (ep.widthMeters || 1.8) * scale);
        return (
          <div
            key={ep.id}
            className={`entry-point ${selected ? "selected" : ""}`}
            title={`${ep.name || "Entrance"} · ${Number(ep.widthMeters || 0).toFixed(1)} m`}
            style={{
              left: st.x * scale - size / 2,
              top: st.y * scale - size / 2,
              width: size,
              height: size,
              zIndex: 7,
              cursor: editDisabled || drawing ? "default" : "pointer",
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              if (drawing) return;
              setSelection({ kind: "entryPoint", id: ep.id });
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <span className="entry-glyph">⇥</span>
          </div>
        );
      })}
    </div>
  );
}
