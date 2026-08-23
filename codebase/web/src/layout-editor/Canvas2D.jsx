import { useEffect, useMemo, useRef, useState } from "react";
import { FIXTURE_TYPES, ZONE_TYPES } from "../referenceCatalog.js";
import ShelfBadge from "./ShelfBadge.jsx";
import ShelfHoverTooltip from "./ShelfHoverTooltip.jsx";
import { isDoubleSided, isPairedShelf, mergePairedShelfForCanvas, normalizeShelfUI, shelfCanvasFaceLabel } from "./shelfFaces.js";
import { isTemporaryStorageShelf } from "../temporaryStorage.js";
import { emojiForCategoryId } from "../storeTypes.js";
import { categoryChipStyle, colorForShelfFace, withAlpha } from "../categoryColors.js";
import { OBSTACLE_TYPES } from "../obstacleTypes.js";
import { resolveAssetUrl } from "../assetUrl.js";
import { categoryLabel } from "../catalog/buildCategoryTree.js";
import {
  shelfLabelFitsFaceEdge,
  shelfLabelFitsGondolaFace,
  shelfLabelFitsShelfBadge,
} from "./canvasLabelZoom.js";
import {
  entityFitsPolygon,
  entityPlacementValid,
  fromStageCoords,
  layoutCanvasBounds,
  layoutFixtureZoneRect,
  normalizeFixtureRectangle,
  pointInPolygon,
  polygonAabb,
  rectanglePolygon,
  resizeFixtureRectCorner,
  resizeFixtureRectEdge,
  shelfCanvasAabb,
  shelfFitsPolygon,
  shelfLocalMeters,
  toStageCoords,
  aisleFootprintMeters,
} from "./polygonCanvas.js";
import { MISSING_PRODUCT_MIME, parseMissingProduct } from "./missingProductDrag.js";
import {
  aabbIntersectsViewport,
  shouldCullCanvasEntities,
} from "./viewportCull.js";

const snap = (v) => Math.max(0, Math.round(v * 2) / 2);
const snapFine = (v) => Math.max(0, Math.round(v * 20) / 20);

const EDGE_HIT_PX = 8;

function shelfCullAabb(f) {
  if (f.pairDisplay && Number(f.canvasAabbW) > 0) {
    return {
      x: Number(f.x) || 0,
      y: Number(f.y) || 0,
      w: f.canvasAabbW,
      d: f.canvasAabbD,
    };
  }
  const aabb = shelfCanvasAabb(f);
  return { x: aabb.x, y: aabb.y, w: aabb.w, d: aabb.d };
}

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
  ["nw", { left: -6, top: -6, cursor: "nwse-resize" }],
  ["n", { left: "calc(50% - 6px)", top: -6, cursor: "ns-resize" }],
  ["ne", { right: -6, top: -6, cursor: "nesw-resize" }],
  ["e", { right: -6, top: "calc(50% - 6px)", cursor: "ew-resize" }],
  ["se", { right: -6, bottom: -6, cursor: "nwse-resize" }],
  ["s", { left: "calc(50% - 6px)", bottom: -6, cursor: "ns-resize" }],
  ["sw", { left: -6, bottom: -6, cursor: "nesw-resize" }],
  ["w", { left: -6, top: "calc(50% - 6px)", cursor: "ew-resize" }],
];

function boostedHandleStyle(style, half) {
  const out = { ...style };
  for (const key of ["left", "right", "top", "bottom"]) {
    const v = out[key];
    if (v === -6) out[key] = -half;
    else if (typeof v === "string" && v.includes("calc(50% - 6px)")) {
      out[key] = `calc(50% - ${half}px)`;
    }
  }
  return out;
}

/** 8 resize grips rendered as children of a selected, absolutely-positioned entity. */
function ResizeHandles({ onStart, boost = 1 }) {
  const half = Math.max(6, Math.round(6 * boost));
  const size = half * 2;
  const slop = Math.max(8, Math.round(8 * boost));
  return HANDLE_DIRS.map(([dir, style]) => (
    <div
      key={dir}
      className="resize-handle"
      style={{
        position: "absolute",
        width: size,
        height: size,
        ...boostedHandleStyle(style, half),
      }}
      onMouseDown={(e) => {
        e.stopPropagation();
        e.preventDefault();
        onStart(dir, e);
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <span className="resize-handle-slop" style={{ inset: -slop }} aria-hidden />
    </div>
  ));
}

/** Any tool that drops something onto the floor (fixtures, aisle, zones, entry). */
function isPlacerTool(tool, fixtureTypeKeys) {
  return (
    (fixtureTypeKeys && fixtureTypeKeys.has(tool)) ||
    !!FIXTURE_TYPES[tool] ||
    tool === "aisle" ||
    tool === "aisle-h" ||
    tool === "aisle-v" ||
    tool === "entry" ||
    isZoneTool(tool)
  );
}

function isZoneTool(tool) {
  return typeof tool === "string" && tool.startsWith("zone:");
}

function zoneToolType(tool) {
  return tool.slice("zone:".length);
}

function normalizeDrawRect(x0, y0, x1, y1) {
  return {
    x: Math.min(x0, x1),
    y: Math.min(y0, y1),
    w: Math.max(0.1, Math.abs(x1 - x0)),
    h: Math.max(0.1, Math.abs(y1 - y0)),
  };
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

function clampPointToEnvelope(x, y, envelope) {
  if (!envelope) return { x, y };
  const minX = Number(envelope.x) || 0;
  const minY = Number(envelope.y) || 0;
  const maxX = minX + (Number(envelope.widthMeters) || 0);
  const maxY = minY + (Number(envelope.depthMeters) || 0);
  return {
    x: Math.max(minX, Math.min(maxX, x)),
    y: Math.max(minY, Math.min(maxY, y)),
  };
}

function normalizeDeg(deg) {
  return ((Number(deg) || 0) % 360 + 360) % 360;
}

/** Gondola face split follows shelf rotation: 0/180 → depth split, 90/270 → width split. */
function gondolaSplitAlongWidth(rotationDeg) {
  const n = normalizeDeg(rotationDeg);
  return n === 90 || n === 270;
}

function gondolaFaceLayout(splitAlongWidth) {
  if (splitAlongWidth) {
    return {
      front: { left: 0, top: 0, width: "50%", height: "100%" },
      back: { left: "50%", top: 0, width: "50%", height: "100%" },
      spine: { left: "50%", top: "6%", width: 3, height: "88%", transform: "translateX(-50%)" },
    };
  }
  return {
    front: { left: 0, top: 0, width: "100%", height: "50%" },
    back: { left: 0, top: "50%", width: "100%", height: "50%" },
    spine: { left: "6%", top: "50%", width: "88%", height: 3, transform: "translateY(-50%)" },
  };
}

function snapDeg(deg, shiftKey) {
  const n = normalizeDeg(deg);
  if (!shiftKey) return Math.round(n);
  return Math.round(n / 15) * 15;
}

function pointInAabb(pt, aabb, pad = 0) {
  return (
    pt.x >= aabb.x - pad &&
    pt.x <= aabb.x + aabb.w + pad &&
    pt.y >= aabb.y - pad &&
    pt.y <= aabb.y + aabb.d + pad
  );
}

/** Pick front/back from layout point within shelf AABB (matches axis-aligned render). */
function pickGondolaFaceFromAabb(pt, aabb, rotDeg) {
  const lx = pt.x - aabb.x;
  const ly = pt.y - aabb.y;
  const splitAlongWidth = gondolaSplitAlongWidth(rotDeg);
  if (splitAlongWidth) return lx >= aabb.w / 2 ? "B" : "A";
  return ly >= aabb.d / 2 ? "B" : "A";
}

function shelfRenderBox(live, rp, rotatePreview, rotateActive) {
  const logicalW = rp ? rp.w : shelfDrawSize(live).w;
  const logicalD = rp ? rp.h : shelfDrawSize(live).d;
  const drawX = rp ? rp.x : live.x;
  const drawY = rp ? rp.y : live.y;
  const rot = rotatePreview != null && rotateActive ? rotatePreview : normalizeDeg(live.rotationDeg);
  const probe = {
    ...live,
    x: drawX,
    y: drawY,
    rotationDeg: rot,
    usableWidthMeters: logicalW,
    widthMeters: logicalW,
    depthMeters: logicalD,
  };
  const aabb =
    live.pairDisplay && live.canvasAabbW
      ? {
          x: live.x,
          y: live.y,
          w: live.canvasAabbW,
          d: live.canvasAabbD,
          originX: live.canvasOriginX ?? drawX,
          originY: live.canvasOriginY ?? drawY,
        }
      : shelfCanvasAabb(probe);
  return {
    logicalW,
    logicalD,
    w: aabb.w,
    d: aabb.d,
    drawX,
    drawY,
    rot,
    aabb,
  };
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
  onSelectShelf,
  paletteTool,
  editDisabled,
  ctrlHeld = false,
  dragPos,
  draggingKind = null,
  setDragging,
  onDropTool,
  onPlaceClick,
  onPlaceZoneRect,
  onResize,
  onRotateShelf,
  categories,
  draftPolygon,
  onDrawVertex,
  onDraftPolygonChange,
  onCloseDraw,
  onPolygonChange,
  onPolygonPreviewChange,
  products,
  webglBackground = false,
  previewFixturePolygon = null,
  canvasBounds: canvasBoundsProp = null,
  fixtureTypeKeys = null,
  onDropMissingProduct,
  onMissingProductDropMiss,
  onPatchFloorPlan,
  viewportWorld = null,
}) {
  const floorRef = useRef(null);
  const editPreviewRef = useRef(null);
  const hoverTimerRef = useRef(null);
  const [hover, setHover] = useState(null);
  const [hoverAnchor, setHoverAnchor] = useState(null);
  const [zoneDraw, setZoneDraw] = useState(null);
  const zoneDrawRef = useRef(null);
  const [floorPlanDrag, setFloorPlanDrag] = useState(null);
  const CLOSE_VERTEX_M = 0.45;
  const drawing = paletteTool === "draw";
  const editingArea = paletteTool === "edit-area";
  const zoneDrawing = isZoneTool(paletteTool);
  const computedBounds = useMemo(
    () =>
      layoutCanvasBounds(layout, {
        expandToEnvelope: drawing,
        previewPoly: previewFixturePolygon,
      }),
    [layout, drawing, previewFixturePolygon]
  );
  const bounds = canvasBoundsProp ?? computedBounds;
  const fixtureZone = useMemo(
    () => layoutFixtureZoneRect(layout, previewFixturePolygon),
    [layout, previewFixturePolygon]
  );
  const shelves = layout.shelves?.length ? layout.shelves : layout.fixtures || [];
  const outsideIds = new Set(
    (layout.validation?.containmentViolations || []).map((v) => `${v.kind}:${v.id}`)
  );
  const layoutEditActive = Boolean(selection?.layoutEdit);
  const layoutPickActive = layoutEditActive && paletteTool === "select" && !editDisabled && !drawing && !editingArea;

  function isLayoutPickEvent(e) {
    return (
      (ctrlHeld || Boolean(e?.ctrlKey || e?.metaKey)) &&
      !editDisabled &&
      !drawing &&
      !editingArea
    );
  }

  function shelfMatchesLayoutSelection(shelfId) {
    return (
      selection?.layoutEdit &&
      (selection.kind === "shelf" || selection.kind === "fixture") &&
      selection.id === shelfId
    );
  }
  const savedPoly = bounds.polygon;
  const envelope = bounds.storeEnvelope;
  const activeFixturePoly = useMemo(() => {
    if (savedPoly?.length >= 3) return savedPoly;
    if (previewFixturePolygon?.length >= 3) return previewFixturePolygon;
    return rectanglePolygon(
      fixtureZone.x,
      fixtureZone.y,
      fixtureZone.widthMeters,
      fixtureZone.depthMeters
    );
  }, [savedPoly, previewFixturePolygon, fixtureZone]);
  const poly = activeFixturePoly;

  const visibleShelves = useMemo(() => {
    const list = shelves.map((s) => normalizeShelfUI(s));

    const byPair = new Map();
    for (const s of list) {
      if (!s.pairId) continue;
      if (!byPair.has(s.pairId)) byPair.set(s.pairId, {});
      byPair.get(s.pairId)[s.pairRole === "back" ? "back" : "front"] = s;
    }

    const merged = [];
    for (const s of list) {
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

  const selectedAisleId = useMemo(() => {
    if (!selection || (selection.kind !== "shelf" && selection.kind !== "fixture")) return null;
    const phys = shelves.find((s) => s.id === selection.id);
    return phys?.aisleId || null;
  }, [selection, shelves]);

  function layoutPointFromEvent(e) {
    const rect = (floorRef.current || e.currentTarget).getBoundingClientRect();
    const sx = snap((e.clientX - rect.left) / scale);
    const sy = snap((e.clientY - rect.top) / scale);
    return fromStageCoords(sx, sy, bounds);
  }

  function layoutPointFromClient(clientX, clientY) {
    const rect = floorRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    const sx = snap((clientX - rect.left) / scale);
    const sy = snap((clientY - rect.top) / scale);
    return fromStageCoords(sx, sy, bounds);
  }

  function insideZone(x, y) {
    if (!poly) return true;
    return pointInPolygon(x, y, poly);
  }

  useEffect(() => {
    if (!zoneDraw) return undefined;
    const onMove = (e) => {
      const pt = layoutPointFromClient(e.clientX, e.clientY);
      if (!zoneDrawRef.current) return;
      zoneDrawRef.current = { ...zoneDrawRef.current, currentX: pt.x, currentY: pt.y };
      setZoneDraw({ ...zoneDrawRef.current });
    };
    const onUp = (e) => {
      const prev = zoneDrawRef.current;
      zoneDrawRef.current = null;
      setZoneDraw(null);
      if (!prev) return;
      const pt = layoutPointFromClient(e.clientX, e.clientY);
      let { x, y, w, h } = normalizeDrawRect(prev.startX, prev.startY, pt.x, pt.y);
      if (w < 0.5 && h < 0.5) {
        w = 3;
        h = 3;
        x = prev.startX;
        y = prev.startY;
      }
      onPlaceZoneRect?.(prev.type, x, y, w, h);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [Boolean(zoneDraw), onPlaceZoneRect, scale, bounds]);

  // ---- Resize gesture (zones + aisles + shelves) ----
  const [resize, setResize] = useState(null);
  const [resizePreview, setResizePreview] = useState(null);
  const [rotate, setRotate] = useState(null);
  const [rotatePreview, setRotatePreview] = useState(null);
  const [vertexDrag, setVertexDrag] = useState(null);
  const [edgeDrag, setEdgeDrag] = useState(null);
  const [draftDrag, setDraftDrag] = useState(null);
  const [drawCursor, setDrawCursor] = useState(null);
  const [missingProductDropTarget, setMissingProductDropTarget] = useState(null);
  const resizeRef = useRef(null);
  const previewRef = useRef(null);
  const rotateRef = useRef(null);
  const rotatePreviewRef = useRef(null);
  resizeRef.current = resize;
  previewRef.current = resizePreview;
  rotateRef.current = rotate;
  rotatePreviewRef.current = rotatePreview;

  const cullViewport = useMemo(() => {
    const entityCount = shelves.length + (layout.aisles?.length || 0);
    return viewportWorld && shouldCullCanvasEntities(entityCount) ? viewportWorld : null;
  }, [shelves.length, layout.aisles, viewportWorld]);

  const visibleAisles = useMemo(() => {
    const list = layout.aisles || [];
    if (!cullViewport) return list;
    const keepIds = new Set();
    if (selection?.kind === "aisle" && selection.id) keepIds.add(selection.id);
    if (dragPos?.id && draggingKind === "aisle") keepIds.add(dragPos.id);
    if (resizePreview?.id && resize?.kind === "aisle") keepIds.add(resizePreview.id);
    if (selectedAisleId) keepIds.add(selectedAisleId);
    return list.filter((a) => {
      if (keepIds.has(a.id)) return true;
      const fp = aisleFootprintMeters(a, layout);
      const minX = fp.x;
      const minY = fp.y;
      return aabbIntersectsViewport(
        { minX, minY, maxX: minX + fp.w, maxY: minY + fp.d },
        cullViewport
      );
    });
  }, [
    layout,
    cullViewport,
    selection,
    dragPos,
    draggingKind,
    resizePreview,
    resize,
    selectedAisleId,
  ]);

  const renderShelves = useMemo(() => {
    if (!cullViewport) return visibleShelves;
    const keepIds = new Set();
    if (selection?.id && (selection.kind === "shelf" || selection.kind === "fixture")) {
      keepIds.add(selection.id);
    }
    if (dragPos?.id && draggingKind === "shelf") keepIds.add(dragPos.id);
    if (resizePreview?.id && resize?.kind === "shelf") keepIds.add(resizePreview.id);
    return visibleShelves.filter((f) => {
      if (keepIds.has(f.id) || (f.pairShelfIds && Object.values(f.pairShelfIds).some((id) => keepIds.has(id)))) {
        return true;
      }
      const aabb = shelfCullAabb(f);
      return aabbIntersectsViewport(
        { minX: aabb.x, minY: aabb.y, maxX: aabb.x + aabb.w, maxY: aabb.y + aabb.d },
        cullViewport
      );
    });
  }, [visibleShelves, cullViewport, selection, dragPos, draggingKind, resizePreview, resize]);

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
      // Columns are far smaller than fixtures, so they snap to 5 cm instead of 50 cm.
      const snapFn = r.kind === "obstacle" ? snapFine : snap;
      x = snapFn(x);
      y = snapFn(y);
      w = Math.max(r.min.w, snapFn(w));
      h = Math.max(r.min.h, snapFn(h));
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
        if (r.kind === "zone" || r.kind === "obstacle") {
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
      const { x, y } = layoutPointFromClient(e.clientX, e.clientY);
      const aabb = polygonAabb(vertexDrag.vertices);
      const next = resizeFixtureRectCorner(aabb, vertexDrag.index, x, y, envelope);
      if (!next) return;
      editPreviewRef.current = next;
      setVertexDrag((v) => (v ? { ...v, preview: next } : v));
      onPolygonPreviewChange?.(next);
    };
    const onUp = () => {
      const preview = editPreviewRef.current ?? vertexDrag.preview;
      editPreviewRef.current = null;
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
  }, [vertexDrag, scale, bounds, envelope]);

  useEffect(() => {
    if (!edgeDrag) return undefined;
    const onMove = (e) => {
      const { x, y } = layoutPointFromClient(e.clientX, e.clientY);
      const aabb = polygonAabb(edgeDrag.baseVertices);
      const next = resizeFixtureRectEdge(aabb, edgeDrag.edgeIndex, x, y, envelope);
      if (!next) return;
      editPreviewRef.current = next;
      setEdgeDrag((v) => (v ? { ...v, preview: next } : v));
      onPolygonPreviewChange?.(next);
    };
    const onUp = () => {
      const preview = editPreviewRef.current ?? edgeDrag.preview;
      editPreviewRef.current = null;
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
  }, [edgeDrag, scale, bounds, envelope]);

  useEffect(() => {
    if (!draftDrag) return undefined;
    const onMove = (e) => {
      const { x, y } = layoutPointFromClient(e.clientX, e.clientY);
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

  function scheduleShelfHover(payload, e) {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    hoverTimerRef.current = setTimeout(() => {
      setHover(payload);
      setHoverAnchor({ x: e.clientX, y: e.clientY });
    }, 500);
  }

  function clearShelfHover() {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setHover(null);
    setHoverAnchor(null);
  }

  useEffect(() => () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
  }, []);

  function pickShelfFaceAtPoint(pt, f, frontId, backId, live, rp, rotState) {
    const { aabb, rot } = shelfRenderBox(live, rp, rotatePreview, rotState);
    if (!pointInAabb(pt, aabb, 0.02)) return null;
    if (f.pairDisplay && backId) {
      const faceId = pickGondolaFaceFromAabb(pt, aabb, rot);
      return { shelfId: faceId === "B" ? backId : frontId, faceId, mergedShelf: f };
    }
    return { shelfId: f.id, faceId: "A", mergedShelf: null };
  }

  function pickShelfFaceLocal(e, f, frontId, backId, live, rp, rotState) {
    const pt = layoutPointFromClient(e.clientX, e.clientY);
    return pickShelfFaceAtPoint(pt, f, frontId, backId, live, rp, rotState);
  }

  function findShelfHitFromEvent(e) {
    const pt = layoutPointFromClient(e.clientX, e.clientY);
    for (let i = renderShelves.length - 1; i >= 0; i -= 1) {
      const f = renderShelves[i];
      const frontId = f.pairShelfIds?.front ?? f.id;
      const backId = f.pairShelfIds?.back;
      const live = dragPos && dragPos.id === frontId ? dragPos : f;
      const rp = resizePreview && (resizePreview.id === f.id || resizePreview.id === frontId) ? resizePreview : null;
      const rotState = rotate?.id === frontId || rotate?.id === f.id;
      const hit = pickShelfFaceAtPoint(pt, f, frontId, backId, live, rp, rotState);
      if (hit) return hit;
    }
    return null;
  }

  function handleMissingProductDragOver(e) {
    if (editDisabled || drawing) return false;
    if (!e.dataTransfer.types.includes(MISSING_PRODUCT_MIME)) return false;
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
    const hit = findShelfHitFromEvent(e);
    setMissingProductDropTarget(hit ? { shelfId: hit.shelfId, faceId: hit.faceId } : null);
    return true;
  }

  function handleMissingProductDrop(e) {
    if (editDisabled || drawing) return false;
    const product = parseMissingProduct(e.dataTransfer.getData(MISSING_PRODUCT_MIME));
    if (!product) return false;
    e.preventDefault();
    e.stopPropagation();
    setMissingProductDropTarget(null);
    const hit = findShelfHitFromEvent(e);
    if (!hit) {
      onMissingProductDropMiss?.();
      return true;
    }
    onDropMissingProduct?.({
      productId: product.productId,
      productName: product.name,
      productSku: product.sku,
      categoryId: product.categoryId,
      shelfId: hit.shelfId,
      faceId: hit.faceId,
    });
    return true;
  }

  function handleShelfSlotMouseDown(e, f, frontId, backId) {
    e.stopPropagation();
    if (drawing || editDisabled) return;
    const live = dragPos && dragPos.id === frontId ? dragPos : f;
    const rp = resizePreview && (resizePreview.id === f.id || resizePreview.id === frontId) ? resizePreview : null;
    const rotState = rotate?.id === frontId || rotate?.id === f.id;
    const hit = pickShelfFaceLocal(e, f, frontId, backId, live, rp, rotState);
    if (!hit) return;

    const layoutPick = isLayoutPickEvent(e);
    const alreadySelected = shelfMatchesLayoutSelection(hit.shelfId);
    if (layoutPick) e.preventDefault();

    if (layoutPick) {
      if (onSelectShelf) {
        onSelectShelf(hit.shelfId, hit.faceId, { openPlanogram: false, layoutSelect: true });
      } else {
        setSelection({ kind: "shelf", id: hit.shelfId, faceId: hit.faceId, layoutEdit: true });
      }
    } else if (alreadySelected) {
      // Sticky layout selection — drag/resize without holding Ctrl.
    } else {
      if (onSelectShelf) {
        onSelectShelf(hit.shelfId, hit.faceId, { openPlanogram: true, layoutSelect: false });
      }
      return;
    }
    const origX = f.pairOrigins?.front?.x ?? f.canvasOriginX ?? f.x;
    const origY = f.pairOrigins?.front?.y ?? f.canvasOriginY ?? f.y;
    setDragging({
      kind: "shelf",
      id: f.pairDisplay && backId ? frontId : f.id,
      layoutId: layout.id,
      startClientX: e.clientX,
      startClientY: e.clientY,
      origX,
      origY,
    });
  }

  function handleShelfSlotMouseMove(e, f, frontId, backId) {
    if (drawing) return;
    const live = dragPos && dragPos.id === frontId ? dragPos : f;
    const rp = resizePreview && (resizePreview.id === f.id || resizePreview.id === frontId) ? resizePreview : null;
    const rotState = rotate?.id === frontId || rotate?.id === f.id;
    const hit = pickShelfFaceLocal(e, f, frontId, backId, live, rp, rotState);
    if (hit) {
      scheduleShelfHover({ shelfId: hit.shelfId, faceId: hit.faceId, mergedShelf: hit.mergedShelf }, e);
    } else {
      clearShelfHover();
    }
  }

  const showHandles = !editDisabled && !drawing && !editingArea;
  const editBasePoly = useMemo(() => {
    if (savedPoly?.length >= 3) return normalizeFixtureRectangle(savedPoly);
    if (editingArea) {
      return rectanglePolygon(
        fixtureZone.x,
        fixtureZone.y,
        fixtureZone.widthMeters,
        fixtureZone.depthMeters
      );
    }
    return null;
  }, [savedPoly, editingArea, fixtureZone]);
  const editVertices = edgeDrag?.preview || vertexDrag?.preview || editBasePoly;
  const draftVertices = draftDrag?.preview || draftPolygon;

  const liveFixtureZone = useMemo(() => {
    const poly = edgeDrag?.preview || vertexDrag?.preview;
    if (poly?.length >= 3) {
      const aabb = polygonAabb(poly);
      if (aabb) {
        return {
          x: aabb.minX,
          y: aabb.minY,
          widthMeters: aabb.width,
          depthMeters: aabb.height,
        };
      }
    }
    return fixtureZone;
  }, [edgeDrag?.preview, vertexDrag?.preview, fixtureZone]);

  const editPolyPoints =
    editVertices?.length >= 3
      ? editVertices
          .map((p) => {
            const st = toStageCoords(p.x, p.y, bounds);
            return `${st.x * scale},${st.y * scale}`;
          })
          .join(" ")
      : "";

  const showBoundaryLayer =
    drawing || editingArea || (draftPolygon?.length ?? 0) > 0;
  const showStoreEnvelopeOutline = Boolean(envelope && (drawing || editingArea));
  const showStoreFloor = !webglBackground && !drawing;
  const showFixtureFloor = showStoreFloor && !drawing;
  const hasFloorPlanUnderlay = Boolean(layout.floorPlan?.url && layout.floorPlan.visible !== false);
  const fixtureLayerZ = hasFloorPlanUnderlay ? 10 : 5;
  const aisleLayerZ = hasFloorPlanUnderlay ? 8 : 3;
  const floorPxW = bounds.width * scale;
  const floorPxH = bounds.height * scale;
  const fixtureLeft = (liveFixtureZone.x - bounds.minX) * scale;
  const fixtureTop = (liveFixtureZone.y - bounds.minY) * scale;
  const fixturePxW = liveFixtureZone.widthMeters * scale;
  const fixturePxH = liveFixtureZone.depthMeters * scale;

  return (
    <div
      ref={floorRef}
      className={`floor-plan${showStoreFloor ? " floor-plan-store" : ""}${hasFloorPlanUnderlay ? " floor-plan--has-underlay" : ""}${webglBackground ? " floor-plan-webgl-overlay" : ""}`}
      style={{
        ...(webglBackground
          ? { position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 1, pointerEvents: "auto" }
          : { width: floorPxW, height: floorPxH }),
        ...(showStoreFloor
          ? hasFloorPlanUnderlay
            ? { background: "rgba(148, 163, 184, 0.12)", backgroundImage: "none" }
            : {}
          : {
              background: "transparent",
              backgroundImage: "none",
              border: "none",
            }),
        cursor: drawing || editingArea || zoneDrawing || isPlacerTool(paletteTool, fixtureTypeKeys) ? "crosshair" : "default",
      }}
      onDragOver={(e) => {
        if (handleMissingProductDragOver(e)) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setMissingProductDropTarget(null);
      }}
      onDrop={(e) => {
        if (handleMissingProductDrop(e)) return;
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
        if (zoneDrawing && !editDisabled) {
          const { x, y } = layoutPointFromEvent(e);
          if (!insideZone(x, y)) return;
          e.preventDefault();
          const draft = {
            type: zoneToolType(paletteTool),
            startX: x,
            startY: y,
            currentX: x,
            currentY: y,
          };
          zoneDrawRef.current = draft;
          setZoneDraw(draft);
          return;
        }
        // Clear sticky layout selection when clicking empty floor.
        if (selection?.layoutEdit) setSelection(null);
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
        if (isZoneTool(paletteTool)) return;
        if (!isPlacerTool(paletteTool, fixtureTypeKeys)) return;
        if (!insideZone(x, y)) return;
        onPlaceClick(paletteTool, x, y);
      }}
    >
      {hasFloorPlanUnderlay ? (() => {
        const fp = layout.floorPlan;
        const liveX = floorPlanDrag ? floorPlanDrag.x : Number(fp.x) || 0;
        const liveY = floorPlanDrag ? floorPlanDrag.y : Number(fp.y) || 0;
        const st = toStageCoords(liveX, liveY, bounds);
        const selected = selection?.kind === "floorPlan";
        const canEditPlan = !editDisabled && paletteTool === "select" && !drawing && !editingArea;
        return (
          <img
            className={`floor-plan-underlay${selected ? " is-selected" : ""}`}
            src={resolveAssetUrl(fp.url)}
            alt="Floor plan underlay"
            draggable={false}
            data-testid="floorplan-underlay"
            style={{
              position: "absolute",
              left: st.x * scale,
              top: st.y * scale,
              width: Math.max(1, (fp.widthMeters || 10) * scale),
              height: Math.max(1, (fp.depthMeters || 8) * scale),
              transform: fp.rotationDeg ? `rotate(${fp.rotationDeg}deg)` : undefined,
              transformOrigin: "top left",
              opacity: fp.opacity ?? 0.72,
              zIndex: 0,
              pointerEvents: canEditPlan ? "auto" : "none",
              cursor: canEditPlan ? "move" : "default",
              userSelect: "none",
              outline: selected ? "2px solid #A30A2A" : "none",
              outlineOffset: 2,
            }}
            onMouseDown={(e) => {
              if (!canEditPlan) return;
              e.stopPropagation();
              e.preventDefault();
              setSelection?.({ kind: "floorPlan" });
              const start = layoutPointFromEvent(e);
              const originX = Number(fp.x) || 0;
              const originY = Number(fp.y) || 0;
              setFloorPlanDrag({ x: originX, y: originY });
              const onMove = (ev) => {
                const pt = layoutPointFromClient(ev.clientX, ev.clientY);
                if (!pt) return;
                setFloorPlanDrag({
                  x: Math.round((originX + (pt.x - start.x)) * 10) / 10,
                  y: Math.round((originY + (pt.y - start.y)) * 10) / 10,
                });
              };
              const onUp = (ev) => {
                window.removeEventListener("mousemove", onMove);
                window.removeEventListener("mouseup", onUp);
                const pt = layoutPointFromClient(ev.clientX, ev.clientY);
                const next = pt
                  ? {
                      x: Math.round((originX + (pt.x - start.x)) * 10) / 10,
                      y: Math.round((originY + (pt.y - start.y)) * 10) / 10,
                    }
                  : { x: originX, y: originY };
                setFloorPlanDrag(null);
                if (next.x !== originX || next.y !== originY) {
                  onPatchFloorPlan?.(next);
                }
              };
              window.addEventListener("mousemove", onMove);
              window.addEventListener("mouseup", onUp);
            }}
          />
        );
      })() : null}
      {showFixtureFloor ? (
        <div
          className={`fixture-zone-floor${hasFloorPlanUnderlay ? " fixture-zone-floor--with-underlay" : ""}`}
          style={{
            position: "absolute",
            left: fixtureLeft,
            top: fixtureTop,
            width: fixturePxW,
            height: fixturePxH,
            backgroundSize: `${scale}px ${scale}px`,
            /* Underlay sits at z-index 1; keep the cream fill below it, grid outline above when underlay is on. */
            zIndex: hasFloorPlanUnderlay ? 2 : editingArea ? 1 : 0,
            pointerEvents: "none",
          }}
          aria-hidden
        />
      ) : null}
      {showBoundaryLayer ? (
        <svg
          width={bounds.width * scale}
          height={bounds.height * scale}
          className="store-envelope-layer"
          style={{
            position: "absolute",
            inset: 0,
            pointerEvents: "none",
            zIndex: editingArea || drawing ? 8 : 0,
          }}
        >
          {showStoreEnvelopeOutline ? (
            <rect
              className="store-envelope-rect"
              x={(envelope.x - bounds.minX) * scale}
              y={(envelope.y - bounds.minY) * scale}
              width={envelope.widthMeters * scale}
              height={envelope.depthMeters * scale}
            />
          ) : null}
          {editingArea && editPolyPoints ? (
            <polygon className="fixture-zone-poly fixture-zone-editing" points={editPolyPoints} />
          ) : null}
          {editingArea && editVertices?.length >= 2
            ? editVertices.map((p, i) => {
                const next = editVertices[(i + 1) % editVertices.length];
                const mid = { x: (p.x + next.x) / 2, y: (p.y + next.y) / 2 };
                const st = toStageCoords(mid.x, mid.y, bounds);
                const edgeHit = Math.max(12, Math.min(24, 320 / Math.max(scale, 8)));
                return (
                  <rect
                    key={`edge-${i}`}
                    className="polygon-edge-handle"
                    x={st.x * scale - edgeHit / 2}
                    y={st.y * scale - edgeHit / 2}
                    width={edgeHit}
                    height={edgeHit}
                    rx="2"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      const { x, y } = layoutPointFromClient(e.clientX, e.clientY);
                      setEdgeDrag({
                        edgeIndex: i,
                        baseVertices: editVertices.map((v) => ({ ...v })),
                        preview: editVertices.map((v) => ({ ...v })),
                      });
                      editPreviewRef.current = editVertices.map((v) => ({ ...v }));
                    }}
                  />
                );
              })
            : null}
          {editingArea && editVertices?.length
            ? editVertices.map((p, i) => {
                const st = toStageCoords(p.x, p.y, bounds);
                const vertexHit = Math.max(12, Math.min(26, 360 / Math.max(scale, 8)));
                const vertexR = Math.max(5, Math.min(9, vertexHit * 0.38));
                return (
                  <g key={i}>
                    <circle
                      className="polygon-vertex-handle-hit"
                      cx={st.x * scale}
                      cy={st.y * scale}
                      r={vertexHit}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setVertexDrag({
                          index: i,
                          vertices: editVertices.map((v) => ({ ...v })),
                          preview: editVertices.map((v) => ({ ...v })),
                        });
                        editPreviewRef.current = editVertices.map((v) => ({ ...v }));
                      }}
                    />
                    <circle
                      className="polygon-vertex-handle"
                      cx={st.x * scale}
                      cy={st.y * scale}
                      r={vertexR}
                      pointerEvents="none"
                    />
                  </g>
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
                  <g key={`draft-${i}`}>
                    <circle
                      className={`polygon-vertex-handle-hit draft-vertex-handle${isStart ? " draft-close-handle" : ""}`}
                      cx={st.x * scale}
                      cy={st.y * scale}
                      r={isStart ? 14 : 12}
                      onMouseDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        if (isStart && draftVertices.length >= 3) {
                          onCloseDraw?.();
                          setDrawCursor(null);
                          return;
                        }
                        setDraftDrag({
                          index: i,
                          vertices: draftVertices.map((v) => ({ ...v })),
                          preview: draftVertices.map((v) => ({ ...v })),
                        });
                      }}
                    />
                    <circle
                      className={`polygon-vertex-handle draft-vertex-handle${isStart ? " draft-close-handle" : ""}`}
                      cx={st.x * scale}
                      cy={st.y * scale}
                      r={isStart ? 9 : 7}
                      pointerEvents="none"
                    />
                  </g>
                );
              })}
            </>
          ) : null}
        </svg>
      ) : null}

      {zoneDraw ? (() => {
        const meta = ZONE_TYPES[zoneDraw.type] || ZONE_TYPES.special;
        const color = meta.color;
        const rect = normalizeDrawRect(zoneDraw.startX, zoneDraw.startY, zoneDraw.currentX, zoneDraw.currentY);
        const st = toStageCoords(rect.x, rect.y, bounds);
        return (
          <div
            className="zone zone-draw-preview"
            style={{
              left: st.x * scale,
              top: st.y * scale,
              width: Math.max(12, rect.w * scale),
              height: Math.max(12, rect.h * scale),
              background: `${color}33`,
              border: `2px dashed ${color}`,
              zIndex: 9,
              pointerEvents: "none",
            }}
            aria-hidden
          >
            <span className="zone-badge" style={{ background: color }}>
              {meta.label}
            </span>
          </div>
        );
      })() : null}

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
              pointerEvents: drawing || editDisabled ? "none" : "auto",
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

      {(layout.obstacles || []).map((o) => {
        const meta = OBSTACLE_TYPES[o.type] || OBSTACLE_TYPES.column;
        const color = o.color || meta.color;
        const selected = selection?.kind === "obstacle" && selection.id === o.id;
        const pv = resizePreview && resizePreview.id === o.id ? resizePreview : null;
        const ox = pv ? pv.x : o.x || 0;
        const oy = pv ? pv.y : o.y || 0;
        const ow = pv ? pv.w : o.widthMeters || 0.4;
        const od = pv ? pv.h : o.depthMeters || 0.4;
        const st = toStageCoords(ox, oy, bounds);
        return (
          <div
            key={o.id}
            className={`obstacle obstacle-${o.type}${selected ? " selected" : ""}`}
            title={`${o.name || meta.label} · ${ow.toFixed(2)}×${od.toFixed(2)} m — blocks fixtures`}
            style={{
              position: "absolute",
              left: st.x * scale,
              top: st.y * scale,
              width: Math.max(6, ow * scale),
              height: Math.max(6, od * scale),
              background: `repeating-linear-gradient(45deg, ${withAlpha(color, 0.85)} 0, ${withAlpha(color, 0.85)} 5px, ${withAlpha(color, 0.55)} 5px, ${withAlpha(color, 0.55)} 10px)`,
              border: `1.5px solid ${color}`,
              borderRadius: o.type === "column" ? 3 : 2,
              boxShadow: selected ? `0 0 0 3px ${withAlpha(color, 0.4)}` : "none",
              zIndex: selected ? 9 : 7,
              cursor: layoutEditActive && selected ? "grab" : layoutPickActive ? "grab" : editDisabled || drawing ? "default" : "pointer",
              pointerEvents: drawing || editDisabled ? "none" : "auto",
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              if (drawing) return;
              if (!isLayoutPickEvent(e)) return;
              setSelection({ kind: "obstacle", id: o.id, layoutEdit: true });
              if (editDisabled || paletteTool !== "select") return;
              const dir = hitTestResizeEdge(e, e.currentTarget);
              if (dir && showHandles) {
                startResize(
                  {
                    kind: "obstacle",
                    id: o.id,
                    orientation: null,
                    orig: { x: o.x || 0, y: o.y || 0, w: o.widthMeters || 0.4, h: o.depthMeters || 0.4 },
                    min: { w: 0.1, h: 0.1 },
                  },
                  dir,
                  e
                );
                return;
              }
              if (!layoutEditActive && !layoutPickActive) return;
              setDragging({
                kind: "obstacle",
                id: o.id,
                layoutId: layout.id,
                startClientX: e.clientX,
                startClientY: e.clientY,
                origX: o.x || 0,
                origY: o.y || 0,
              });
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {ow * scale >= 26 && od * scale >= 20 ? (
              <span className="obstacle-label mono">{o.name || meta.label}</span>
            ) : null}
            {selected && showHandles ? (
              <ResizeHandles
                onStart={(dir, e) =>
                  startResize(
                    {
                      kind: "obstacle",
                      id: o.id,
                      orientation: null,
                      orig: { x: o.x || 0, y: o.y || 0, w: o.widthMeters || 0.4, h: o.depthMeters || 0.4 },
                      min: { w: 0.1, h: 0.1 },
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
        const aisleBoundToShelf =
          Boolean(selectedAisleId && selectedAisleId === a.id) &&
          (selection?.kind === "shelf" || selection?.kind === "fixture");
        const aisleEmphasis = selected || aisleBoundToShelf;
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
            className={`aisle aisle-interactive ${bad ? "bad" : ""} ${vertical ? "aisle-vertical" : ""}${aisleEmphasis ? " aisle-bound-highlight" : ""}${aisleBoundToShelf ? " aisle-bound-by-shelf" : ""}`}
            title={`${a.name || "Aisle"} · ${Number(a.widthMeters || 0).toFixed(1)} m wide`}
            style={{
              left: stA.x * scale,
              top: stA.y * scale,
              width: Math.max(20, wMeters * scale),
              height: Math.max(16, hMeters * scale),
              background: aisleBoundToShelf
                ? undefined
                : aisleEmphasis
                  ? "rgba(100,116,139,0.5)"
                  : a.color
                    ? `${a.color}2b`
                    : bad
                      ? "rgba(163,10,42,0.12)"
                      : vertical
                        ? "rgba(100,116,139,0.42)"
                        : "rgba(148,163,184,0.38)",
              boxShadow: aisleBoundToShelf
                ? undefined
                : aisleEmphasis
                  ? "0 0 0 3px rgba(31,41,51,0.28)"
                  : selected
                    ? "0 0 0 3px rgba(31,41,51,0.28)"
                    : vertical
                      ? "inset 0 0 0 1px rgba(71,85,105,0.35)"
                      : "none",
              cursor: layoutEditActive && selected ? "grab" : layoutPickActive ? "grab" : editDisabled || drawing ? "default" : "pointer",
              pointerEvents: drawing || editDisabled ? "none" : "auto",
              zIndex: aisleEmphasis ? aisleLayerZ + 3 : selected ? aisleLayerZ + 2 : aisleLayerZ,
            }}
            onMouseDown={(e) => {
              e.stopPropagation();
              if (drawing) return;
              const layoutPick = isLayoutPickEvent(e);
              const alreadySelected = selection?.layoutEdit && selection.kind === "aisle" && selection.id === a.id;
              if (!layoutPick && !alreadySelected) return;
              if (layoutPick) setSelection({ kind: "aisle", id: a.id, layoutEdit: true });
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
              {a.aisleNumber != null ? `Aisle ${a.aisleNumber}` : a.name?.startsWith("Walk") ? a.name : `Walk · ${a.name || `aisle ${idx + 1}`}`}
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

      {renderShelves.map((f) => {
        const frontId = f.pairShelfIds?.front ?? f.id;
        const backId = f.pairShelfIds?.back;
        const pairIds = backId ? [frontId, backId] : [f.id];
        const isShelfSelection =
          selection?.kind === "shelf" || selection?.kind === "fixture";
        const selFace = selection?.faceId === "B" ? "B" : "A";
        const dual = isDoubleSided(f) || f.pairDisplay;
        const paired = isPairedShelf(f) && !f.pairDisplay;
        // FR-AISLE-01: select one aisle-facing physical shelf/face — never co-select gondola mate.
        const faceASelected = Boolean(
          isShelfSelection &&
            (f.pairDisplay
              ? selection.id === frontId
              : selection.id === f.id && (!dual || selFace === "A"))
        );
        const faceBSelected = Boolean(
          isShelfSelection &&
            (f.pairDisplay
              ? selection.id === backId
              : selection.id === f.id && dual && selFace === "B")
        );
        const unitHasSelection = faceASelected || faceBSelected;
        const faceADimmed = f.pairDisplay && unitHasSelection && !faceASelected;
        const faceBDimmed = f.pairDisplay && unitHasSelection && !faceBSelected;
        const selected = unitHasSelection;
        const showUnitSelection = unitHasSelection;
        const dragId = dragPos && pairIds.includes(dragPos.id) ? frontId : dragPos?.id;
        const live = dragPos && dragPos.id === frontId ? dragPos : f;
        const rp = resizePreview && (resizePreview.id === f.id || resizePreview.id === frontId) ? resizePreview : null;
        const rotState = rotate?.id === frontId || rotate?.id === f.id;
        const { w, d, rot, aabb, logicalW, logicalD } = shelfRenderBox(live, rp, rotatePreview, rotState);
        const st = toStageCoords(aabb.x, aabb.y, bounds);
        const zone = f.temperatureZone || "ambient";
        const zoneClass =
          zone === "chilled" ? "shelf-chilled" : zone === "frozen" ? "shelf-frozen" : "";
        const faceA = f.faces?.find((face) => face.id === "A");
        const faceB = f.faces?.find((face) => face.id === "B");
        const splitAlongWidth = gondolaSplitAlongWidth(rot);
        const faceLayout = gondolaFaceLayout(splitAlongWidth);
        // Shelves are tinted by the category they merchandise; the temperature-zone
        // tint is only a fallback for unmapped fixtures.
        const colorA = colorForShelfFace(f, "A", categories);
        const colorB = colorForShelfFace(f, "B", categories);
        const unmappedFill =
          zone === "chilled"
            ? "rgba(14,165,233,0.18)"
            : zone === "frozen"
              ? "rgba(56,189,248,0.22)"
              : "rgba(163,10,42,0.12)";
        const isTemp = isTemporaryStorageShelf(f);
        const fillColor = f.pairDisplay
          ? "transparent"
          : isTemp
            ? "rgba(245,158,11,0.22)"
            : paired
            ? colorA
              ? withAlpha(colorA, 0.34)
              : unmappedFill
            : dual && colorA && colorB && colorA !== colorB
              ? splitAlongWidth
                ? `linear-gradient(to right, ${withAlpha(colorA, 0.28)} 50%, ${withAlpha(colorB, 0.28)} 50%)`
                : `linear-gradient(to bottom, ${withAlpha(colorA, 0.28)} 50%, ${withAlpha(colorB, 0.28)} 50%)`
              : colorA
                ? withAlpha(colorA, 0.24)
                : unmappedFill;
        const segments =
          (dual && f.pairDisplay
            ? f.faces?.find((face) => face.segments?.length)?.segments
            : f.faces?.find((face) => face.id === "A")?.segments) ||
          f.segments ||
          [];
        const usable = logicalW;
        const outside =
          outsideIds.has(`shelf:${f.id}`) ||
          (backId && outsideIds.has(`shelf:${backId}`)) ||
          (poly && !shelfFitsPolygon(f, poly));
        const pixelW = aabb.w * scale;
        const pixelH = aabb.d * scale;
        const showGondolaFaceLabels = f.pairDisplay && shelfLabelFitsGondolaFace(pixelW, pixelH, splitAlongWidth);
        const showShelfBadge =
          !f.pairDisplay && shelfLabelFitsShelfBadge(pixelW, pixelH, { dualFace: dual && !paired });
        const showFaceEdgeLabels =
          dual && !f.pairDisplay && shelfLabelFitsFaceEdge(pixelW, pixelH, splitAlongWidth);
        const isDropTarget =
          missingProductDropTarget?.shelfId === frontId ||
          missingProductDropTarget?.shelfId === backId ||
          missingProductDropTarget?.shelfId === f.id;
        const selectedAisleLabel = faceASelected
          ? shelfCanvasFaceLabel(f, "A", layout.aisles, layout.shelves)
          : faceBSelected
            ? shelfCanvasFaceLabel(f, "B", layout.aisles, layout.shelves)
            : !f.pairDisplay && showUnitSelection
              ? shelfCanvasFaceLabel(f, selFace, layout.aisles, layout.shelves)
              : null;
        const selectionRingStyle = faceASelected
          ? faceLayout.front
          : faceBSelected
            ? faceLayout.back
            : null;

        return (
          <div
            key={f.id}
            className={`fx-slot fx-slot-interactive ${f.pairDisplay ? "fx-slot-gondola" : ""}${isTemp ? " fx-slot-temporary" : ""}${showUnitSelection && !f.pairDisplay ? " fx-slot-selected" : ""}${faceASelected ? " fx-slot-face-a-selected" : ""}${faceBSelected ? " fx-slot-face-b-selected" : ""}${isDropTarget ? " fx-slot-drop-target" : ""}${(layoutEditActive || layoutPickActive) && showUnitSelection ? " fx-slot-layout-edit" : ""}`}
            style={{
              position: "absolute",
              left: st.x * scale,
              top: st.y * scale,
              width: aabb.w * scale,
              height: aabb.d * scale,
              zIndex: selected ? fixtureLayerZ + 1 : paired && f.pairRole === "back" ? fixtureLayerZ - 1 : fixtureLayerZ,
              pointerEvents: drawing || editDisabled ? "none" : "auto",
              overflow: "visible",
              cursor: layoutEditActive && selected ? "grab" : layoutPickActive ? "grab" : "pointer",
            }}
            onMouseDown={(e) => handleShelfSlotMouseDown(e, f, frontId, backId)}
            onMouseMove={(e) => handleShelfSlotMouseMove(e, f, frontId, backId)}
            onMouseLeave={clearShelfHover}
            onDragOver={(e) => handleMissingProductDragOver(e)}
            onDrop={(e) => handleMissingProductDrop(e)}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              className={`fx ${zoneClass} ${outside ? "fx-violation" : ""} ${f.pairDisplay ? "fx-gondola" : ""} ${isTemp ? "fx-temporary" : ""} ${paired ? `fx-pair fx-pair-${f.pairRole || "front"}` : ""}${!f.pairDisplay && showUnitSelection ? " fx-selected" : ""}`}
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: "100%",
                height: "100%",
                background: fillColor,
                borderColor: outside
                  ? "#dc2626"
                  : isTemp
                    ? "#d97706"
                    : !f.pairDisplay && showUnitSelection
                      ? "#A30A2A"
                      : f.pairDisplay
                        ? "#334155"
                        : colorA || colorB
                          ? colorA || colorB
                          : zone === "chilled"
                            ? "#0ea5e9"
                            : zone === "frozen"
                              ? "#38bdf8"
                              : "#1f2933",
                borderStyle: isTemp ? "dashed" : paired && f.pairRole === "back" ? "dashed" : "solid",
                boxShadow: f.pairDisplay ? "0 2px 8px rgba(15,23,42,0.14)" : "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: selected ? "visible" : "hidden",
                opacity: paired && !selected ? 0.92 : 1,
                pointerEvents: "none",
              }}
            >
            {f.pairDisplay && backId ? (
              <>
                <div
                  className={`gondola-face-pane gondola-face-a${faceASelected ? " selected" : ""}${faceADimmed ? " dimmed" : ""}`}
                  data-testid={faceASelected ? "shelf-face-selected" : undefined}
                  title={`${shelfCanvasFaceLabel(f, "A", layout.aisles, layout.shelves)} · front aisle${faceA?.categoryId ? ` · ${categoryLabel(categories, faceA.categoryId)}` : ""}`}
                  style={{
                    ...faceLayout.front,
                    ...(colorA
                      ? {
                          background: withAlpha(colorA, faceASelected ? 0.56 : faceADimmed ? 0.12 : 0.3),
                          borderColor: colorA,
                        }
                      : null),
                  }}
                >
                  {showGondolaFaceLabels ? (
                    <span className="gondola-face-label mono">
                      {shelfCanvasFaceLabel(f, "A", layout.aisles, layout.shelves)}
                    </span>
                  ) : null}
                  {showGondolaFaceLabels && faceA?.categoryId ? (
                    <span
                      className="gondola-category-emoji category-chip"
                      style={{ position: "absolute", top: 2, left: 3, ...categoryChipStyle(colorA) }}
                      aria-hidden
                    >
                      {emojiForCategoryId(categories, faceA.categoryId)}
                    </span>
                  ) : null}
                </div>
                <div
                  className={`gondola-face-pane gondola-face-b${faceBSelected ? " selected" : ""}${faceBDimmed ? " dimmed" : ""}`}
                  data-testid={faceBSelected ? "shelf-face-selected" : undefined}
                  title={`${shelfCanvasFaceLabel(f, "B", layout.aisles, layout.shelves)} · back aisle${faceB?.categoryId ? ` · ${categoryLabel(categories, faceB.categoryId)}` : ""}`}
                  style={{
                    ...faceLayout.back,
                    ...(colorB
                      ? {
                          background: withAlpha(colorB, faceBSelected ? 0.56 : faceBDimmed ? 0.12 : 0.3),
                          borderColor: colorB,
                        }
                      : null),
                  }}
                >
                  {showGondolaFaceLabels ? (
                    <span className="gondola-face-label mono">
                      {shelfCanvasFaceLabel(f, "B", layout.aisles, layout.shelves)}
                    </span>
                  ) : null}
                  {showGondolaFaceLabels && faceB?.categoryId ? (
                    <span
                      className="gondola-category-emoji category-chip"
                      style={{ position: "absolute", top: 2, left: 3, ...categoryChipStyle(colorB) }}
                      aria-hidden
                    >
                      {emojiForCategoryId(categories, faceB.categoryId)}
                    </span>
                  ) : null}
                </div>
                <div className="gondola-spine" aria-hidden style={faceLayout.spine} />
              </>
            ) : null}
            {dual && !f.pairDisplay ? (
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
            {showFaceEdgeLabels ? (
              <>
                <span
                  className={`face-edge-label face-a-edge mono${faceASelected ? " selected" : ""}`}
                  style={splitAlongWidth ? { left: 4, top: "50%", transform: "translateY(-50%)" } : { top: 4, left: "50%", transform: "translateX(-50%)" }}
                  title={`Face A (${shelfCanvasFaceLabel(f, "A", layout.aisles, layout.shelves)})`}
                >
                  {shelfCanvasFaceLabel(f, "A", layout.aisles, layout.shelves)}
                </span>
                <span
                  className={`face-edge-label face-b-edge mono${faceBSelected ? " selected" : ""}`}
                  style={splitAlongWidth ? { right: 4, top: "50%", transform: "translateY(-50%)" } : { bottom: 4, left: "50%", transform: "translateX(-50%)" }}
                  title={`Face B (${shelfCanvasFaceLabel(f, "B", layout.aisles, layout.shelves)})`}
                >
                  {shelfCanvasFaceLabel(f, "B", layout.aisles, layout.shelves)}
                </span>
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
            {showShelfBadge ? (
              <ShelfBadge
                shelf={f}
                pixelWidth={w * scale}
                categories={categories}
                aisles={layout.aisles}
                allShelves={layout.shelves}
              />
            ) : null}
            {!f.pairDisplay && (faceA?.categoryId || f.categoryId) ? (
              <span
                className="gondola-category-emoji category-chip"
                style={{
                  position: "absolute",
                  top: 2,
                  left: 3,
                  pointerEvents: "none",
                  ...categoryChipStyle(colorA),
                }}
                aria-hidden
                title={categoryLabel(categories, faceA?.categoryId || f.categoryId)}
              >
                {emojiForCategoryId(categories, faceA?.categoryId || f.categoryId)}
              </span>
            ) : null}
            {dual && !f.pairDisplay && faceB?.categoryId && showFaceEdgeLabels ? (
              <span
                className="gondola-category-emoji category-chip"
                style={{
                  position: "absolute",
                  bottom: 2,
                  right: 3,
                  pointerEvents: "none",
                  ...categoryChipStyle(colorB),
                }}
                aria-hidden
                title={categoryLabel(categories, faceB.categoryId)}
              >
                {emojiForCategoryId(categories, faceB.categoryId)}
              </span>
            ) : null}
            </div>
            {selectedAisleLabel && selectionRingStyle ? (
              <div
                key={`ring-${selection?.id}-${selectedAisleLabel}`}
                className={`shelf-selection-ring${faceBSelected ? " shelf-selection-ring--b" : ""}`}
                style={selectionRingStyle}
                aria-hidden
              />
            ) : null}
            {!f.pairDisplay && showUnitSelection ? (
              <div
                key={`ring-${selection?.id}-full`}
                className="shelf-selection-ring shelf-selection-ring--full"
                aria-hidden
              />
            ) : null}
            {selectedAisleLabel ? (
              <div
                key={`callout-${selection?.id}-${selectedAisleLabel}`}
                className={`shelf-selection-callout${faceBSelected ? " shelf-selection-callout--b" : ""}`}
                style={selectionRingStyle || undefined}
                aria-hidden
              >
                <span className="shelf-selection-callout-label mono">{selectedAisleLabel}</span>
              </div>
            ) : null}
            {showUnitSelection && showHandles && (layoutEditActive || layoutPickActive) ? (
              <ResizeHandles
                boost={Math.max(1, scale / 48)}
                onStart={(dir, ev) => {
                  const resizeId = f.pairDisplay && backId ? frontId : f.id;
                  const origX = f.pairOrigins?.front?.x ?? f.canvasOriginX ?? f.x;
                  const origY = f.pairOrigins?.front?.y ?? f.canvasOriginY ?? f.y;
                  startResize(
                    {
                      kind: "shelf",
                      id: resizeId,
                      rotationDeg: rot,
                      orig: { x: origX, y: origY, w: logicalW, h: logicalD },
                      min: { w: 0.4, h: 0.25 },
                    },
                    dir,
                    ev
                  );
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
      <ShelfHoverTooltip
        hover={hover}
        layout={layout}
        categories={categories}
        products={products}
        anchor={hoverAnchor}
      />
    </div>
  );
}
