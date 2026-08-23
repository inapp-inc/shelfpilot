import { aisleFootprintMeters } from "../layout-editor/polygonCanvas.js";
import { shelfMapUnits } from "./shopperMapGeometry.js";

function expandBounds(b, x, y) {
  if (!Number.isFinite(x) || !Number.isFinite(y)) return b;
  return {
    minX: Math.min(b.minX, x),
    minY: Math.min(b.minY, y),
    maxX: Math.max(b.maxX, x),
    maxY: Math.max(b.maxY, y),
  };
}

function boundsFromCorners(corners) {
  let b = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (const c of corners || []) b = expandBounds(b, c.x, c.y);
  if (!Number.isFinite(b.minX)) return null;
  return b;
}

function centroid(corners) {
  if (!corners?.length) return { x: 0, y: 0 };
  return {
    x: corners.reduce((s, c) => s + c.x, 0) / corners.length,
    y: corners.reduce((s, c) => s + c.y, 0) / corners.length,
  };
}

/** Walkable aisle corridor — one centred badge per aisle (kiosk readability). */
export function runwayBandsForMap(layout) {
  const aisles = (layout?.aisles || []).filter((a) => a?.id && a.id !== "aisle-check");

  return aisles
    .map((aisle) => {
      const fp = aisleFootprintMeters(aisle, layout);
      const isVert = aisle.orientation === "vertical";
      const number = aisle.aisleNumber != null ? String(aisle.aisleNumber) : "";
      const label = number || aisle.name || "";
      const cx = fp.x + fp.w / 2;
      const cy = fp.y + fp.d / 2;
      return {
        id: aisle.id,
        aisleNumber: aisle.aisleNumber,
        label,
        x: fp.x,
        y: fp.y,
        w: fp.w,
        h: fp.d,
        cx,
        cy,
        orientation: aisle.orientation,
        badge: {
          x: cx,
          y: cy,
          rotate: isVert ? -90 : 0,
          corridor: Math.min(fp.w, fp.d),
        },
      };
    })
    .filter((b) => b.w > 0.1 && b.h > 0.1)
    .sort((a, b) => Number(a.aisleNumber ?? 999) - Number(b.aisleNumber ?? 999));
}

function faceBounds(corners) {
  if (!corners?.length) return { w: 0, h: 0, long: 0 };
  const xs = corners.map((c) => c.x);
  const ys = corners.map((c) => c.y);
  const w = Math.max(0.05, Math.max(...xs) - Math.min(...xs));
  const h = Math.max(0.05, Math.max(...ys) - Math.min(...ys));
  return { w, h, long: Math.max(w, h), short: Math.min(w, h) };
}

function tileFontSize(corners, viewSpan, isTarget = false) {
  const { long, short } = faceBounds(corners);
  const base = Math.max(
    0.36,
    Math.min(0.78, long * 0.42, short * 0.72, viewSpan / 24)
  );
  return isTarget ? base * 1.14 : base;
}

/** Whether a shelf label is large enough to read on the kiosk map. */
export function shelfLabelVisibleOnMap(corners, viewSpan, isTarget = false) {
  if (isTarget) return true;
  const { long, short } = faceBounds(corners);
  return long >= viewSpan * 0.018 && short >= viewSpan * 0.006 && long * short >= viewSpan * viewSpan * 0.00012;
}

/** One labelled tile per fixture — exact rotated footprint (gondola = two faces). */
export function shelfTilesForMap(layout, viewSpan = 30) {
  return shelfMapUnits(layout).map((unit) => {
    const xs = (unit.corners || []).map((c) => c.x);
    const ys = (unit.corners || []).map((c) => c.y);
    const highlightIds = unit.highlightIds instanceof Set ? unit.highlightIds : new Set(unit.highlightIds || [unit.id]);
    return {
      id: unit.id,
      kind: unit.kind,
      aisleId: unit.aisleId || null,
      corners: unit.corners,
      faces: (unit.faces || []).map((face) => ({
        ...face,
        fontSize: tileFontSize(face.corners, viewSpan),
      })),
      highlightIds,
      spine: unit.spine,
      aabb: {
        x: Math.min(...xs),
        y: Math.min(...ys),
        w: Math.max(...xs) - Math.min(...xs),
        h: Math.max(...ys) - Math.min(...ys),
      },
      label: unit.label,
      at: unit.labelAt || centroid(unit.corners),
      fontSize: tileFontSize(unit.corners, viewSpan),
      rotate: Number(unit.rotationDeg) || 0,
    };
  });
}

export function schematicFontSize(viewBoxWidth, viewBoxHeight) {
  const span = Math.max(viewBoxWidth, viewBoxHeight);
  return Math.max(0.55, Math.min(1.05, span / 26));
}

export function schematicAisleFontSize(viewBoxWidth, viewBoxHeight, corridorM = 1.2, { emphasize = false } = {}) {
  const span = Math.max(viewBoxWidth, viewBoxHeight);
  const renderWidthPx = 560;
  const minBadgeFontPx = emphasize ? 16 : 13;
  const minFromPx = (minBadgeFontPx * span) / renderWidthPx;
  const cap = emphasize ? 0.82 : 0.62;
  return Math.max(0.38, minFromPx, Math.min(cap, corridorM * 0.52, span / 22));
}

/** Minimum aisle badge circle radius in layout units. */
export function aisleBadgeMinRadiusUserUnits(
  viewBoxWidth,
  { minDiameterPx = 26, renderWidthPx = 560, emphasize = false } = {}
) {
  const scale = viewBoxWidth / renderWidthPx;
  const px = emphasize ? minDiameterPx + 4 : minDiameterPx;
  return (px / 2) * scale;
}

/** Route stroke width in layout units so it renders >= minPx at typical map width. */
export function routeStrokeUserUnits(viewBoxWidth, { minPx = 12, renderWidthPx = 560 } = {}) {
  const scale = viewBoxWidth / renderWidthPx;
  return Math.max(0.05, minPx * scale);
}

/** Pixel-stable dash pattern expressed in layout units for the current viewBox. */
export function routeDashPatternUserUnits(
  viewBoxWidth,
  { dashPx = 14, gapPx = 9, renderWidthPx = 560 } = {}
) {
  const scale = viewBoxWidth / renderWidthPx;
  const dash = dashPx * scale;
  const gap = gapPx * scale;
  return { dash, gap, period: dash + gap };
}

/** Screen pixels a user-unit stroke occupies when the SVG is renderWidthPx wide. */
export function routeStrokeScreenPx(strokeUserUnits, viewBoxWidth, renderWidthPx = 560) {
  return strokeUserUnits * (renderWidthPx / viewBoxWidth);
}

export { boundsFromCorners, centroid };
