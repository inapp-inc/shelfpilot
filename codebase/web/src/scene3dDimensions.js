/**
 * Dimension helpers for 3D — aligned with 2D canvas (polygonCanvas) and API planogramMath.
 * All values in metres unless noted.
 */
import { shelfLocalMeters, shelfCanvasAabb, gondolaCanvasAabb } from "./layout-editor/polygonCanvas.js";
import { normalizeShelfUI } from "./layout-editor/shelfFaces.js";
import { productDimensions as catalogProductDimensions } from "./productCatalog.js";
import { facingWidthInSlot, PRODUCT_LATERAL_BUFFER_TOTAL_M } from "../../shared/productBuffer.mjs";

import { formatLengthFromMeters } from "./units.js";

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
    // Front/back share one floor footprint — both faces sit back-to-back inside local.d.
    return {
      widthMeters: local.w,
      depthMeters: local.d,
      heightMeters: Number(front.heightMeters ?? f.heightMeters) || 2,
      merchWidthMeters: local.w,
      faceDepthMeters: local.d / 2,
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
    faceDepthMeters: local.d,
    originX: Number(f.x ?? f.canvasOriginX) || 0,
    originZ: Number(f.y ?? f.canvasOriginY) || 0,
    rotationRad: rotationRad(f),
    isGondola: Boolean(f.pairDisplay),
  };
}

/** World XZ of the shopper-facing side for the selected merchandising face. */
export function shelfFaceWorldFocus(rawShelf, layout, { physicalShelfId = null, faceId = "A" } = {}) {
  const base = shelfWorldFocus(rawShelf, layout, null);
  const activeFace = faceId === "B" ? "B" : "A";
  const box = shelf3dLocalBox(rawShelf, layout);
  const rot = base.rot || 0;
  const dual = base.dual;
  const w = box.widthMeters;
  const d = box.depthMeters;
  const faceDepth = Math.max(0.15, Number(box.faceDepthMeters) || (dual ? d / 2 : d));
  const originX = box.originX;
  const originZ = box.originZ;

  const ringZ = dual
    ? activeFace === "B"
      ? d - faceDepth * 0.35
      : faceDepth * 0.35
    : d * 0.42;
  const localX = w / 2;
  const cos = Math.cos(rot);
  const sin = Math.sin(rot);
  const x = originX + localX * cos - ringZ * sin;
  const z = originZ + localX * sin + ringZ * cos;

  const shelves = layout?.shelves?.length ? layout.shelves : layout?.fixtures || [];
  let aisleId = null;
  if (physicalShelfId) {
    aisleId = shelves.find((s) => s.id === physicalShelfId)?.aisleId || null;
  }
  if (!aisleId && rawShelf?.pairDisplay) {
    aisleId = activeFace === "B" ? rawShelf.rearAisleId : rawShelf.facingAisleId;
  }
  if (!aisleId) aisleId = rawShelf?.aisleId || null;

  return {
    ...base,
    x,
    z,
    activeFace,
    faceDepth,
    aisleId,
    physicalShelfId: physicalShelfId || null,
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
  let gap = Math.max(0.12, ceiling - floorY - 0.035);
  const cap = Number(level?.clearanceMeters);
  if (Number.isFinite(cap) && cap > 0) gap = Math.min(gap, cap);
  return gap;
}

/** Product facing size from catalog dimensions and bay slot (matches planogram math). */
export function productFacingSize(product, slotWidthMeters, levelClearanceMeters, shelfDepthMeters) {
  const dims = catalogProductDimensions(product);
  const slotW = Math.max(0.08, Number(slotWidthMeters) || 0.2);
  const clearance = Math.max(0.12, Number(levelClearanceMeters) || 0.3);
  const shelfD = Math.max(0.1, Number(shelfDepthMeters) || 0.6);
  // Guard against bad catalog data (cm stored as metres) — keep units shelf-plausible.
  const catalogW = Number.isFinite(dims.w) && dims.w > 0 && dims.w < 2 ? dims.w : 0.12;
  const catalogH = Number.isFinite(dims.h) && dims.h > 0 && dims.h < 2.5 ? dims.h : 0.2;
  const catalogD = Number.isFinite(dims.d) && dims.d > 0 && dims.d < 1.5 ? dims.d : Math.min(catalogW, 0.12);
  const facingW = Math.max(0.05, facingWidthInSlot(slotW, catalogW));
  const facingH = Math.min(catalogH, clearance * 0.95);
  // One unit must leave room for depth stacking — never claim ~90% of the whole face depth.
  const depthSlot = Math.max(0.06, shelfD * 0.42);
  const facingD = Math.max(0.04, Math.min(catalogD, depthSlot - PRODUCT_LATERAL_BUFFER_TOTAL_M));
  return {
    w: Math.max(0.05, facingW),
    h: Math.max(0.06, facingH),
    d: Math.max(0.04, facingD),
    catalog: dims,
  };
}

export function formatMeters(value, digits = 2) {
  return formatLengthFromMeters(value, { dash: "—" });
}
