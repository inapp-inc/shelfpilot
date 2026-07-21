import { useEffect, useRef, useState } from "react";
import { FIXTURE_TYPES, ZONE_TYPES } from "../referenceCatalog.js";
import {
  fromStageCoords,
  layoutCanvasBounds,
  pointInPolygon,
  toStageCoords,
} from "./polygonCanvas.js";

const snap = (v) => Math.max(0, Math.round(v * 2) / 2);

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
  const rot = ((Number(shelf.rotationDeg) || 0) % 360 + 360) % 360;
  const usable = Number(shelf.usableWidthMeters ?? shelf.widthMeters) || 1.2;
  const depth = Number(shelf.depthMeters) || 0.6;
  const widthM = Number(shelf.widthMeters) || usable;
  if (rot === 90 || rot === 270) {
    return { w: widthM, d: depth || usable };
  }
  return { w: usable, d: depth };
}

function ShelfBadge({ shelf }) {
  const num = shelf.displayNumber;
  if (!num) return null;

  if (shelf.doubleSided && shelf.faces?.length >= 2) {
    const faceA = shelf.faces.find((f) => f.id === "A") || shelf.faces[0];
    const faceB = shelf.faces.find((f) => f.id === "B") || shelf.faces[1];
    return (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 10,
          fontWeight: 700,
          lineHeight: 1.2,
        }}
      >
        <span
          className="mono"
          style={{
            flex: 1,
            textAlign: "center",
            padding: "2px 0",
            background: faceA?.color ? `${faceA.color}44` : "rgba(163,10,42,0.15)",
            color: "#1f2933",
            borderRight: "1px solid rgba(31,41,51,0.15)",
          }}
        >
          {num}A
        </span>
        <span
          className="mono"
          style={{
            flex: 1,
            textAlign: "center",
            padding: "2px 0",
            background: faceB?.color ? `${faceB.color}44` : "rgba(14,165,233,0.15)",
            color: "#1f2933",
          }}
        >
          {num}B
        </span>
      </div>
    );
  }

  return (
    <span className="mono" style={{ fontSize: 11, fontWeight: 700, color: "#1f2933" }}>
      {num}
    </span>
  );
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
  draftPolygon,
  onDrawVertex,
}) {
  const bounds = layoutCanvasBounds(layout);
  const shelves = layout.shelves?.length ? layout.shelves : layout.fixtures || [];
  const outsideIds = new Set(
    (layout.validation?.containmentViolations || []).filter((v) => v.kind === "shelf").map((v) => v.id)
  );
  const visibleShelves = shelves.filter((s) => !outsideIds.has(s.id));
  const drawing = paletteTool === "draw";
  const poly = bounds.polygon;

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
  const resizeRef = useRef(null);
  const previewRef = useRef(null);
  resizeRef.current = resize;
  previewRef.current = resizePreview;

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

  const showHandles = !editDisabled && !drawing;

  return (
    <div
      className="floor-plan floor-plan-strict"
      style={{
        width: bounds.width * scale,
        height: bounds.height * scale,
        backgroundSize: `${scale}px ${scale}px`,
        border: poly ? "none" : undefined,
        cursor: drawing || isPlacerTool(paletteTool) ? "crosshair" : "default",
        clipPath: poly
          ? `polygon(${poly
              .map(
                (p) =>
                  `${((p.x - bounds.minX) / bounds.width) * 100}% ${((p.y - bounds.minY) / bounds.height) * 100}%`
              )
              .join(", ")})`
          : undefined,
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
      {(poly || draftPolygon?.length) ? (
        <svg
          width={bounds.width * scale}
          height={bounds.height * scale}
          style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
        >
          {poly ? (
            <polygon
              points={poly
                .map((p) => {
                  const st = toStageCoords(p.x, p.y, bounds);
                  return `${st.x * scale},${st.y * scale}`;
                })
                .join(" ")}
              fill="rgba(163,10,42,0.05)"
              stroke="#A30A2A"
              strokeWidth="2"
              strokeDasharray="7 5"
            />
          ) : null}
          {draftPolygon?.length ? (
            <>
              <polyline
                points={draftPolygon
                  .map((p) => {
                    const st = toStageCoords(p.x, p.y, bounds);
                    return `${st.x * scale},${st.y * scale}`;
                  })
                  .join(" ")}
                fill="none"
                stroke="#0ea5e9"
                strokeWidth="2"
              />
              {draftPolygon.map((p, i) => {
                const st = toStageCoords(p.x, p.y, bounds);
                return <circle key={i} cx={st.x * scale} cy={st.y * scale} r="4" fill="#0ea5e9" />;
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
            className="zone"
            style={{
              left: st.x * scale,
              top: st.y * scale,
              width: Math.max(20, zw * scale),
              height: Math.max(16, zh * scale),
              background: `${color}22`,
              border: `1.5px dashed ${color}`,
              boxShadow: selected ? `0 0 0 3px ${color}55` : "none",
              // Zones sit at the bottom; even when selected they stay under shelves so
              // shelves overlapping a zone remain clickable. Resize grips lift themselves.
              zIndex: selected ? 2 : 0,
              cursor: editDisabled || drawing ? "default" : "pointer",
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              if (drawing) return;
              setSelection({ kind: "zone", id: z.id });
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
        const { w, d } = shelfDrawSize(live);
        const st = toStageCoords(live.x, live.y, bounds);
        const zone = f.temperatureZone || "ambient";
        const zoneClass =
          zone === "chilled" ? "shelf-chilled" : zone === "frozen" ? "shelf-frozen" : "";
        const faceA = f.faces?.find((face) => face.id === "A");
        const fillColor =
          f.doubleSided && faceA?.color
            ? `${faceA.color}33`
            : f.color || (zone === "chilled" ? "rgba(14,165,233,0.18)" : zone === "frozen" ? "rgba(56,189,248,0.22)" : "rgba(163,10,42,0.12)");
        return (
          <div
            key={f.id}
            className={`fx ${zoneClass}`}
            style={{
              left: st.x * scale,
              top: st.y * scale,
              width: w * scale,
              height: d * scale,
              background: fillColor,
              borderColor: selected ? "#A30A2A" : zone === "chilled" ? "#0ea5e9" : zone === "frozen" ? "#38bdf8" : "#1f2933",
              boxShadow: selected ? "0 0 0 3px rgba(163,10,42,0.25)" : "none",
              cursor: editDisabled || drawing || paletteTool !== "select" ? "pointer" : "grab",
              // Shelves are the primary interactive layer — always above zones/aisles so
              // they can be clicked/selected even where a zone or aisle overlaps them.
              zIndex: selected ? 6 : 5,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
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
            <ShelfBadge shelf={f} />
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
