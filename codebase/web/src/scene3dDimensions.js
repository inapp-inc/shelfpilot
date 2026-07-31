/**
 * Dimension helpers for 3D — aligned with 2D canvas (polygonCanvas) and API planogramMath.
 * All values in metres unless noted.
 */
import { shelfLocalMeters, shelfCanvasAabb, gondolaCanvasAabb } from "./layout-editor/polygonCanvas.js";
import { normalizeShelfUI } from "./layout-editor/shelfFaces.js";
import { productDimensions as catalogProductDimensions } from "./productCatalog.js";

export { catalogProductDimensions as productDimensions };

export function layoutBounds(layout) {
  const w = Number(layout?.widthMeters ?? layout?.storeEnvelope?.widthMeters) || 10;
  const d = Number(layout?.depthMeters ?? layout?.storeEnvelope?.depthMeters) || 10;
  const h = Number(layout?.heightMeters) || 3;
  return {
    widthMeters: w,
    depthMeters: d,
    heightMeters: h,
    centerX: w / 2,
    centerZ: d / 2,
    maxDim: Math.max(w, d, 1),
  };
}

function rotationRad(shelf) {
  return ((((Number(shelf?.rotationDeg) || 0) % 360) + 360) % 360) * (Math.PI / 180);
}

/** Local rack box for 3D meshes — uses fixture width/depth/height, not rotated canvas AABB. */
export function shelf3dLocalBox(shelf, layout) {
  const f = normalizeShelfUI(shelf);
  const shelves = layout?.shelves?.length ? layout.shelves : layout?.fixtures || [];

  if (f.pairDisplay && f.pairShelfIds?.front) {
    const front = shelves.find((s) => s.id === f.pairShelfIds.front) || f;
    const local = shelfLocalMeters(front);
    return {
      widthMeters: local.w,
      depthMeters: local.d,
      heightMeters: Number(front.heightMeters ?? f.heightMeters) || 2,
      merchWidthMeters: local.w,
      originX: Number(front.x ?? f.x) || 0,
      originZ: Number(front.y ?? f.y) || 0,
      rotationRad: rotationRad(front),
      isGondola: true,
    };
  }

  const local = shelfLocalMeters(f);
  return {
    widthMeters: local.w,
    depthMeters: local.d,
    heightMeters: Number(f.heightMeters) || 2,
    merchWidthMeters: local.w,
    originX: Number(f.x ?? f.canvasOriginX) || 0,
    originZ: Number(f.y ?? f.canvasOriginY) || 0,
    rotationRad: rotationRad(f),
    isGondola: Boolean(f.pairDisplay),
  };
}

/** World-space centre for camera highlight — uses canvas AABB (includes rotation). */
export function shelfWorldFocus(rawShelf, layout, highlightPairId) {
  const f = normalizeShelfUI(rawShelf);
  let aabb = shelfCanvasAabb(f);
  const shelves = layout?.shelves?.length ? layout.shelves : layout?.fixtures || [];

  if (f.pairShelfIds?.front && f.pairShelfIds?.back) {
    const front = shelves.find((s) => s.id === f.pairShelfIds.front) || f;
    const back = shelves.find((s) => s.id === f.pairShelfIds.back);
    if (back) aabb = gondolaCanvasAabb(front, back);
  } else if (f.pairId && highlightPairId) {
    const mate = shelves.find((s) => s.pairId === f.pairId && s.id !== f.id);
    if (mate) {
      const front = f.pairRole === "back" ? mate : f;
      const back = f.pairRole === "back" ? f : mate;
      aabb = gondolaCanvasAabb(front, back);
    }
  }

  const box = shelf3dLocalBox(f, layout);
  return {
    x: aabb.x + aabb.w / 2,
    z: aabb.y + aabb.d / 2,
    w: aabb.w,
    d: aabb.d,
    merchW: box.merchWidthMeters,
    h: box.heightMeters,
    rot: box.rotationRad,
    dual: Boolean(f.pairDisplay || (f.faces?.length > 1 && f.doubleSided !== false)),
  };
}

/** Vertical space available on a shelf level (metres). */
export function levelClearanceMeters(level, levels, shelfHeightMeters) {
  const sorted = [...(levels || [])].sort(
    (a, b) => (Number(a.heightFromFloorMeters) || 0) - (Number(b.heightFromFloorMeters) || 0)
  );
  const floorY = Number(level?.heightFromFloorMeters) || 0.4;
  const idx = sorted.findIndex((l) => Number(l.levelIndex) === Number(level?.levelIndex));
  const next = idx >= 0 ? sorted[idx + 1] : null;
  const ceiling = next ? Number(next.heightFromFloorMeters) : Number(shelfHeightMeters) || 2;
  return Math.max(0.12, ceiling - floorY - 0.035);
}

/** Product facing size from catalog dimensions and bay slot (matches planogram math). */
export function productFacingSize(product, slotWidthMeters, levelClearanceMeters, shelfDepthMeters) {
  const dims = catalogProductDimensions(product);
  const slotW = Math.max(0.08, Number(slotWidthMeters) || 0.2);
  const clearance = Math.max(0.12, Number(levelClearanceMeters) || 0.3);
  const shelfD = Math.max(0.1, Number(shelfDepthMeters) || 0.6);
  const facingW = Math.min(slotW * 0.98, dims.w);
  const facingH = Math.min(dims.h, clearance * 0.95);
  const facingD = Math.min(dims.d, shelfD * 0.9);
  return {
    w: Math.max(0.06, facingW),
    h: Math.max(0.08, facingH),
    d: Math.max(0.05, facingD),
    catalog: dims,
  };
}

export function formatMeters(value, digits = 2) {
  const n = Number(value);
  if (!Number.isFinite(n)) return "—";
  return `${n.toFixed(digits)} m`;
}
