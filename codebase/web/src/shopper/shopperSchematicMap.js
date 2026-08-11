import { aisleFootprintMeters, shelfRotatedCorners, shelfCanvasAabb } from "../layout-editor/polygonCanvas.js";
import { shelfCanvasFaceLabel } from "../layout-editor/shelfFaces.js";

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

function unionBounds(list) {
  let b = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  for (const box of list) {
    if (!box) continue;
    b = expandBounds(b, box.minX, box.minY);
    b = expandBounds(b, box.maxX, box.maxY);
  }
  if (!Number.isFinite(b.minX)) return null;
  return b;
}

function padBounds(b, pad) {
  return {
    minX: b.minX - pad,
    minY: b.minY - pad,
    maxX: b.maxX + pad,
    maxY: b.maxY + pad,
    w: b.maxX - b.minX + pad * 2,
    h: b.maxY - b.minY + pad * 2,
  };
}

function centroid(corners) {
  if (!corners?.length) return { x: 0, y: 0 };
  return {
    x: corners.reduce((s, c) => s + c.x, 0) / corners.length,
    y: corners.reduce((s, c) => s + c.y, 0) / corners.length,
  };
}

/** Thick runway band per numbered aisle — matches editor / mockup gray strips. */
export function runwayBandsForMap(layout) {
  const aisles = (layout?.aisles || []).filter((a) => a?.id && a.id !== "aisle-check");
  const shelves = (layout?.shelves || []).filter((s) => s && !s.pairDisplay);

  return aisles
    .map((aisle) => {
      const bound = shelves.filter((s) => s.aisleId === aisle.id);
      const shelfBounds = bound.map((s) => boundsFromCorners(shelfRotatedCorners(s)));
      const aisleFp = aisleFootprintMeters(aisle, layout);
      const aisleBounds = {
        minX: aisleFp.x,
        minY: aisleFp.y,
        maxX: aisleFp.x + aisleFp.w,
        maxY: aisleFp.y + aisleFp.d,
      };
      const merged = unionBounds([...shelfBounds, aisleBounds]);
      const rect = padBounds(merged, 0.15);
      return {
        id: aisle.id,
        aisleNumber: aisle.aisleNumber,
        label: aisle.aisleNumber != null ? String(aisle.aisleNumber) : aisle.name || "",
        x: rect.minX,
        y: rect.minY,
        w: rect.w,
        h: rect.h,
        cx: rect.minX + rect.w / 2,
        cy: rect.minY + rect.h / 2,
        orientation: aisle.orientation,
      };
    })
    .filter((b) => b.w > 0.1 && b.h > 0.1)
    .sort((a, b) => Number(a.aisleNumber) - Number(b.aisleNumber));
}

/** One labelled tile per physical shelf — pink boxes like mockup (4A, 4M, …). */
export function shelfTilesForMap(layout) {
  const aisles = layout?.aisles || [];
  const allShelves = (layout?.shelves || []).filter((s) => s && !s.pairDisplay);

  return allShelves.map((shelf) => {
    const corners = shelfRotatedCorners(shelf);
    const aabb = shelfCanvasAabb(shelf);
    const label = shelfCanvasFaceLabel(shelf, "A", aisles, allShelves);
    return {
      id: shelf.id,
      aisleId: shelf.aisleId || null,
      corners,
      aabb: { x: aabb.x, y: aabb.y, w: aabb.w, h: aabb.d },
      label,
      at: centroid(corners),
    };
  });
}

export function schematicFontSize(viewBoxWidth, viewBoxHeight) {
  const span = Math.max(viewBoxWidth, viewBoxHeight);
  return Math.max(0.28, Math.min(0.62, span / 38));
}

export function schematicAisleFontSize(viewBoxWidth, viewBoxHeight) {
  return schematicFontSize(viewBoxWidth, viewBoxHeight) * 1.65;
}

export { boundsFromCorners, centroid };
