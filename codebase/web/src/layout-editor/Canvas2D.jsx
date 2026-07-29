import { useEffect, useMemo, useRef, useState } from "react";
import { FIXTURE_TYPES, ZONE_TYPES } from "../referenceCatalog.js";
import ShelfBadge from "./ShelfBadge.jsx";
import { isDoubleSided, isPairedShelf, mergePairedShelfForCanvas, normalizeShelfUI, shelfFaceLabel, faceDigit } from "./shelfFaces.js";
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
    tool === "aisle-h" ||
    tool === "aisle-v" ||
    tool === "entry" ||
    (typeof tool === "string" && tool.startsWith("zone:"))
  );
}

function screenDeltaToLocal(dx, dy, rotationDeg) {
  const rad = (-normalizeDeg(rotationDeg) * Math.PI) / 180;
  return {
    dx: dx * Math.cos(rad) - dy * Math.sin(rad),
    dy: dx * Math.sin(rad) + dy * Math.cos(rad),
  };
}

function shelfDrawSize(shelf) {
  return shelfLocalMeters(shelf);
}

function normalizeDeg(deg) {
  return ((Number(deg) || 0) % 360 + 360) % 360;
}

/** Gondola face split follows shelf rotation: 0/180 → depth split, 90/270 → width split. */
function gondolaSplitAlongWidth(rotationDeg) {
  const n = normalizeDeg(rotationDeg);
  return n === 90 || n === 270;
}

function facingTickStyle(rotationDeg) {
  const n = normalizeDeg(rotationDeg);
  if (n === 90) return { top: "50%", left: 2, transform: "translateY(-50%) rotate(-90deg)" };
  if (n === 180) return { bottom: 2, left: "50%", transform: "translateX(-50%) rotate(180deg)" };
  if (n === 270) return { top: "50%", right: 2, transform: "translateY(-50%) rotate(90deg)" };
  return { top: 2, left: "50%", transform: "translateX(-50%)" };
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
  onCloseDraw,
  onPolygonChange,
}) {
  const floorRef = useRef(null);
  const CLOSE_VERTEX_M = 0.45;
  const bounds = layoutCanvasBounds(layout);
  const shelves = layout.shelves?.length ? layout.shelves : layout.fixtures || [];
  const outsideIds = new Set(
    (layout.validation?.containmentViolations || []).map((v) => `${v.kind}:${v.id}`)
  );
  const drawing = paletteTool === "draw";
  const editingArea = paletteTool === "edit-area";
  const canDragFixtures = !editDisabled && !drawing && !editingArea;
  const poly = bounds.polygon;
  const envelope = bounds.storeEnvelope;
  const hasBoundaries = Boolean(poly?.length >= 3 && envelope);

  const visibleShelves = useMemo(() => {
    const list = shelves.map((s) => normalizeShelfUI(s));
    const filtered = poly ? list.filter((s) => shelfFitsPolygon(s, poly)) : list;

    const byPair = new Map();
    for (const s of filtered) {
      if (!s.pairId) continue;
      if (!byPair.has(s.pairId)) byPair.set(s.pairId, {});
      byPair.get(s.pairId)[s.pairRole === "back" ? "back" : "front"] = s;
    }

    const merged = [];
    for (const s of filtered) {
      if (s.pairId && s.pairRole === "back") {
        continue;
      }
      if (s.pairId) {
        const back = byPair.get(s.pairId)?.back;
        if (back) {
          merged.push(mergePairedShelfForCanvas(s, back));
          continue;
        }
      }
      merged.push(s);
    }
    return merged;
  }, [shelves, poly, selection?.id]);

  const visibleAisles = layout.aisles || [];

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

  // ---- Resize gesture (zones + aisles + shelves) ----
  const [resize, setResize] = useState(null);
  const [resizePreview, setResizePreview] = useState(null);
  const [rotate, setRotate] = useState(null);
  const [rotatePreview, setRotatePreview] = useState(null);
  const [vertexDrag, setVertexDrag] = useState(null);
  const [edgeDrag, setEdgeDrag] = useState(null);
  const [draftDrag, setDraftDrag] = useState(null);
  const [drawCursor, setDrawCursor] = useState(null);
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
      const { dx: ldx, dy: ldy } =
        r.kind === "shelf" ? screenDeltaToLocal(dx, dy, r.rotationDeg || 0) : { dx, dy };
      let { x, y, w, h } = r.orig;
      const dir = r.dir;
      if (dir.includes("w")) {
        x = r.orig.x + ldx;
        w = r.orig.w - ldx;
      }
      if (dir.includes("e")) w = r.orig.w + ldx;
      if (dir.includes("n")) {
        y = r.orig.y + ldy;
        h = r.orig.h - ldy;
      }
      if (dir.includes("s")) h = r.orig.h + ldy;

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
      if (r.kind !== "shelf" && !rectFits(x, y, w, h)) return;
      if (r.kind === "aisle") {
        const tentative =
          r.orientation === "vertical"
            ? { id: r.id, x, y, widthMeters: w, lengthMeters: h, orientation: "vertical" }
            : { id: r.id, x, y, widthMeters: h, lengthMeters: w, orientation: "horizontal" };
        if (!entityPlacementValid(tentative, "aisle", bounds, layout, { ignoreId: r.id })) return;
      }
      if (r.kind === "shelf") {
        const tentative = {
          id: r.id,
          x,
          y,
          usableWidthMeters: w,
          widthMeters: w,
          depthMeters: h,
          rotationDeg: r.rotationDeg || 0,
        };
        if (!entityPlacementValid(tentative, "shelf", bounds, layout, { ignoreId: r.id })) return;
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
        } else if (r.kind === "shelf") {
          patch = {
            x: pv.x,
            y: pv.y,
            usableWidthMeters: pv.w,
            widthMeters: pv.w,
            depthMeters: pv.h,
          };
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
    if (!edgeDrag) return undefined;
    const onMove = (e) => {
      const rect = edgeDrag.rect;
      const sx = snap((e.clientX - rect.left) / scale);
      const sy = snap((e.clientY - rect.top) / scale);
      const { x, y } = fromStageCoords(sx, sy, bounds);
      const dx = x - edgeDrag.startX;
      const dy = y - edgeDrag.startY;
      const n = edgeDrag.baseVertices.length;
      const i = edgeDrag.edgeIndex;
      const j = (i + 1) % n;
      const next = edgeDrag.baseVertices.map((p, idx) => {
        if (idx === i || idx === j) {
          return { x: Math.max(0, p.x + dx), y: Math.max(0, p.y + dy) };
        }
        return { ...p };
      });
      setEdgeDrag((v) => (v ? { ...v, preview: next } : v));
    };
    const onUp = () => {
      const preview = edgeDrag.preview;
      setEdgeDrag(null);
      if (preview?.length >= 3) onPolygonChange?.(preview);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [edgeDrag, scale, bounds]);

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
  const editVertices = edgeDrag?.preview || vertexDrag?.preview || poly;
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
      onMouseMove={(e) => {
        if (!drawing || e.target !== e.currentTarget) return;
        setDrawCursor(layoutPointFromEvent(e));
      }}
      onMouseLeave={() => {
        if (drawing) setDrawCursor(null);
      }}
      onClick={(e) => {
        // Placement / vertex drawing happens on a click of the empty floor itself.
        // (Deselection is handled on mousedown above — never here — so a click that
        // lands on the floor after pressing a shelf doesn't wipe the selection.)
        if (e.target !== e.currentTarget) return;
        if (editDisabled) return;
        const { x, y } = layoutPointFromEvent(e);
        if (drawing) {
          if (draftPolygon?.length >= 3) {
            const first = draftPolygon[0];
            if (Math.hypot(x - first.x, y - first.y) <= CLOSE_VERTEX_M) {
              onCloseDraw?.();
              setDrawCursor(null);
              return;
            }
          }
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
          {editingArea && editVertices?.length >= 2
            ? editVertices.map((p, i) => {
                const next = editVertices[(i + 1) % editVertices.length];
                const mid = { x: (p.x + next.x) / 2, y: (p.y + next.y) / 2 };
                const st = toStageCoords(mid.x, mid.y, bounds);
                return (
                  <rect
                    key={`edge-${i}`}
                    className="polygon-edge-handle"
                    x={st.x * scale - 5}
                    y={st.y * scale - 5}
                    width="10"
                    height="10"
                    rx="2"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      const rect = e.currentTarget.closest(".floor-plan")?.getBoundingClientRect();
                      if (!rect) return;
                      const sx = snap((e.clientX - rect.left) / scale);
                      const sy = snap((e.clientY - rect.top) / scale);
                      const { x, y } = fromStageCoords(sx, sy, bounds);
                      setEdgeDrag({
                        edgeIndex: i,
                        baseVertices: editVertices.map((v) => ({ ...v })),
                        preview: editVertices.map((v) => ({ ...v })),
                        rect,
                        startX: x,
                        startY: y,
                      });
                    }}
                  />
                );
              })
            : null}
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
              {drawCursor && draftVertices.length > 0 ? (() => {
                const last = draftVertices[draftVertices.length - 1];
                const st0 = toStageCoords(last.x, last.y, bounds);
                const st1 = toStageCoords(drawCursor.x, drawCursor.y, bounds);
                const nearClose =
                  draftVertices.length >= 3 &&
                  Math.hypot(drawCursor.x - draftVertices[0].x, drawCursor.y - draftVertices[0].y) <=
                    CLOSE_VERTEX_M;
                return (
                  <>
                    <line
                      x1={st0.x * scale}
                      y1={st0.y * scale}
                      x2={st1.x * scale}
                      y2={st1.y * scale}
                      stroke={nearClose ? "#16a34a" : "#0ea5e9"}
                      strokeWidth="2"
                      strokeDasharray="6 4"
                      pointerEvents="none"
                    />
                    <circle
                      cx={st1.x * scale}
                      cy={st1.y * scale}
                      r="4"
                      fill={nearClose ? "#16a34a" : "#0ea5e9"}
                      opacity="0.85"
                      pointerEvents="none"
                    />
                  </>
                );
              })() : null}
              {draftVertices.map((p, i) => {
                const st = toStageCoords(p.x, p.y, bounds);
                const isStart = i === 0 && draftVertices.length >= 3;
                return (
                  <circle
                    key={`draft-${i}`}
                    className={`polygon-vertex-handle draft-vertex-handle${isStart ? " draft-close-handle" : ""}`}
                    cx={st.x * scale}
                    cy={st.y * scale}
                    r={isStart ? 9 : 7}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      if (isStart && draftVertices.length >= 3) {
                        onCloseDraw?.();
                        setDrawCursor(null);
                        return;
                      }
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

      {visibleAisles.map((a, idx) => {
        const outside = outsideIds.has(`aisle:${a.id}`) || (poly && !entityFitsPolygon(a, "aisle", bounds, layout));
        const bad =
          outside ||
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
                  : vertical
                    ? "rgba(100,116,139,0.42)"
                    : "rgba(148,163,184,0.38)",
              boxShadow: selected ? "0 0 0 3px rgba(31,41,51,0.28)" : vertical ? "inset 0 0 0 1px rgba(71,85,105,0.35)" : "none",
              cursor: canDragFixtures ? "grab" : editDisabled || drawing ? "default" : "pointer",
              zIndex: selected ? 4 : vertical ? 2 : 1,
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              if (drawing) return;
              setSelection({ kind: "aisle", id: a.id });
              if (!canDragFixtures) return;
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
            <span className="aisle-label mono aisle-walk-label">
              {a.name?.startsWith("Walk") ? a.name : `Walk · ${a.name || `aisle ${idx + 1}`}`}
            </span>
            <span className="aisle-dim mono">
              {vertical
                ? `${hMeters.toFixed(1)}×${Number(a.widthMeters || 0).toFixed(1)} m`
                : `${wMeters.toFixed(1)}×${Number(a.widthMeters || 0).toFixed(1)} m`}
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
        const frontId = f.pairShelfIds?.front ?? f.id;
        const backId = f.pairShelfIds?.back;
        const pairIds = backId ? [frontId, backId] : [f.id];
        const selectedFront = (selection?.kind === "shelf" || selection?.kind === "fixture") && selection.id === frontId;
        const selectedBack = backId && (selection?.kind === "shelf" || selection?.kind === "fixture") && selection.id === backId;
        const selected = selectedFront || selectedBack;
        const dragId = dragPos && pairIds.includes(dragPos.id) ? frontId : dragPos?.id;
        const live = dragPos && dragPos.id === frontId ? dragPos : f;
        const outside = outsideIds.has(`shelf:${f.id}`);
        const rp = resizePreview && resizePreview.id === f.id ? resizePreview : null;
        const drawX = rp ? rp.x : live.x;
        const drawY = rp ? rp.y : live.y;
        const w = rp ? rp.w : shelfDrawSize(live).w;
        const d = rp ? rp.h : shelfDrawSize(live).d;
        const st = toStageCoords(drawX, drawY, bounds);
        const rot = rotatePreview != null && rotate?.id === f.id ? rotatePreview : normalizeDeg(live.rotationDeg);
        const zone = f.temperatureZone || "ambient";
        const zoneClass =
          zone === "chilled" ? "shelf-chilled" : zone === "frozen" ? "shelf-frozen" : "";
        const faceA = f.faces?.find((face) => face.id === "A");
        const faceB = f.faces?.find((face) => face.id === "B");
        const dual = isDoubleSided(f) || f.pairDisplay;
        const paired = isPairedShelf(f) && !f.pairDisplay;
        const splitAlongWidth = gondolaSplitAlongWidth(rot);
        const fillColor =
          paired && f.pairRole === "back"
            ? f.color || faceA?.color
              ? `${f.color || faceA.color}55`
              : "rgba(14,165,233,0.22)"
            : paired
              ? f.color || faceA?.color
                ? `${f.color || faceA.color}55`
                : "rgba(163,10,42,0.18)"
          : dual && faceA?.color && faceB?.color
            ? splitAlongWidth
              ? `linear-gradient(to right, ${faceA.color}44 50%, ${faceB.color}44 50%)`
              : `linear-gradient(to bottom, ${faceA.color}44 50%, ${faceB.color}44 50%)`
            : dual && faceA?.color
              ? `${faceA.color}33`
              : f.color || (zone === "chilled" ? "rgba(14,165,233,0.18)" : zone === "frozen" ? "rgba(56,189,248,0.22)" : "rgba(163,10,42,0.12)");
        const segments =
          (dual && f.pairDisplay
            ? f.faces?.find((face) => face.segments?.length)?.segments
            : f.faces?.find((face) => face.id === "A")?.segments) ||
          f.segments ||
          [];
        const usable = w;

        function selectGondolaFace(e, shelfId) {
          e.stopPropagation();
          if (drawing) return;
          setSelection({ kind: "shelf", id: shelfId });
          if (!canDragFixtures) return;
          setDragging({
            kind: "shelf",
            id: frontId,
            layoutId: layout.id,
            startClientX: e.clientX,
            startClientY: e.clientY,
            origX: f.pairOrigins?.front?.x ?? f.x,
            origY: f.pairOrigins?.front?.y ?? f.y,
          });
        }

        return (
          <div
            key={f.id}
            className={`fx ${zoneClass} ${outside ? "fx-violation" : ""} ${f.pairDisplay ? "fx-gondola" : ""} ${paired ? `fx-pair fx-pair-${f.pairRole || "front"}` : ""}`}
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
                  : paired && f.pairRole === "back"
                    ? "#0284c7"
                    : zone === "chilled"
                      ? "#0ea5e9"
                      : zone === "frozen"
                        ? "#38bdf8"
                        : "#1f2933",
              borderStyle: paired && f.pairRole === "back" ? "dashed" : "solid",
              boxShadow: selected ? "0 0 0 3px rgba(163,10,42,0.25)" : "none",
              cursor: canDragFixtures ? "grab" : editDisabled || drawing ? "default" : "pointer",
              zIndex: selected ? 6 : paired && f.pairRole === "back" ? 4 : 5,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: selected ? "visible" : "hidden",
              transform: `rotate(${rot}deg)`,
              transformOrigin: "top left",
              opacity: paired && !selected ? 0.92 : 1,
              pointerEvents: f.pairDisplay ? "none" : "auto",
            }}
            onMouseDown={
              f.pairDisplay
                ? undefined
                : (e) => {
                    e.stopPropagation();
                    if (drawing) return;
                    setSelection({ kind: "shelf", id: f.id });
                    if (!canDragFixtures) return;
                    setDragging({
                      kind: "shelf",
                      id: f.id,
                      layoutId: layout.id,
                      startClientX: e.clientX,
                      startClientY: e.clientY,
                      origX: f.x,
                      origY: f.y,
                    });
                  }
            }
            onClick={(e) => e.stopPropagation()}
          >
            {f.pairDisplay && backId ? (
              <>
                <button
                  type="button"
                  className={`gondola-face-hit gondola-face-front${selectedFront ? " selected" : ""}`}
                  title={`Select ${shelfFaceLabel(f.displayNumber, "A")} (front)`}
                  style={{
                    position: "absolute",
                    zIndex: 2,
                    padding: 0,
                    border: selectedFront ? "2px solid #A30A2A" : "2px solid transparent",
                    borderRadius: 2,
                    background: selectedFront ? "rgba(163,10,42,0.1)" : "transparent",
                    cursor: canDragFixtures ? "grab" : editDisabled || drawing ? "default" : "pointer",
                    ...(splitAlongWidth
                      ? { left: 0, top: 0, width: "50%", height: "100%" }
                      : { left: 0, top: 0, width: "100%", height: "50%" }),
                  }}
                  onMouseDown={(e) => selectGondolaFace(e, frontId)}
                />
                <button
                  type="button"
                  className={`gondola-face-hit gondola-face-back${selectedBack ? " selected" : ""}`}
                  title={`Select ${shelfFaceLabel(f.displayNumber, "B")} (back)`}
                  style={{
                    position: "absolute",
                    zIndex: 2,
                    padding: 0,
                    border: selectedBack ? "2px solid #0284c7" : "2px solid transparent",
                    borderRadius: 2,
                    background: selectedBack ? "rgba(14,165,233,0.12)" : "transparent",
                    cursor: canDragFixtures ? "grab" : editDisabled || drawing ? "default" : "pointer",
                    ...(splitAlongWidth
                      ? { left: "50%", top: 0, width: "50%", height: "100%" }
                      : { left: 0, top: "50%", width: "100%", height: "50%" }),
                  }}
                  onMouseDown={(e) => selectGondolaFace(e, backId)}
                />
              </>
            ) : null}
            {dual ? (
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  pointerEvents: "none",
                  ...(splitAlongWidth
                    ? {
                        left: "8%",
                        right: "8%",
                        top: "50%",
                        height: 0,
                        borderTop: "1px dashed rgba(31,41,51,0.45)",
                      }
                    : {
                        left: "50%",
                        top: "8%",
                        bottom: "8%",
                        width: 0,
                        borderLeft: "1px dashed rgba(31,41,51,0.45)",
                      }),
                }}
              />
            ) : null}
            {dual && d * scale >= 18 ? (
              <>
                <span
                  className="face-edge-label face-a-edge mono"
                  style={splitAlongWidth ? { left: 4, top: "50%", transform: "translateY(-50%)" } : { top: 4, left: "50%", transform: "translateX(-50%)" }}
                  title={`Face A (${shelfFaceLabel(f.displayNumber, "A")})`}
                >
                  {f.pairDisplay ? shelfFaceLabel(f.displayNumber, "A") : faceDigit("A")}
                </span>
                <span
                  className="face-edge-label face-b-edge mono"
                  style={splitAlongWidth ? { right: 4, top: "50%", transform: "translateY(-50%)" } : { bottom: 4, left: "50%", transform: "translateX(-50%)" }}
                  title={`Face B (${shelfFaceLabel(f.displayNumber, "B")})`}
                >
                  {f.pairDisplay ? shelfFaceLabel(f.displayNumber, "B") : faceDigit("B")}
                </span>
                {f.pairDisplay ? (
                  <span className="facing-tick mono" aria-hidden style={{ position: "absolute", fontSize: 9, color: "#475569", ...facingTickStyle(rot) }}>
                    ▲
                  </span>
                ) : null}
              </>
            ) : null}
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
            <ShelfBadge
              shelf={
                f.pairDisplay && selectedBack
                  ? { ...f, pairRole: "back", categoryId: faceB?.categoryId, faces: [{ id: "A", categoryId: faceB?.categoryId }] }
                  : f.pairDisplay && selectedFront
                    ? { ...f, pairRole: "front", categoryId: faceA?.categoryId, faces: [{ id: "A", categoryId: faceA?.categoryId }] }
                    : f
              }
              pixelWidth={w * scale}
              categories={categories}
            />
            {selected && showHandles ? (
              <>
                <ResizeHandles
                  onStart={(dir, e) =>
                    startResize(
                      {
                        kind: "shelf",
                        id: f.id,
                        rotationDeg: rot,
                        orig: { x: drawX, y: drawY, w, h: d },
                        min: { w: 0.4, h: 0.3 },
                      },
                      dir,
                      e
                    )
                  }
                />
                {onRotateShelf ? (
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
              </>
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
