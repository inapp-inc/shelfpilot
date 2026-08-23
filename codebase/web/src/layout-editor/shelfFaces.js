/** Client-side shelf face normalization (mirrors API shelfFaces). */
import { formatShelfCode } from "../../../shared/labelFormat.mjs";
import { gondolaCanvasAabb } from "./polygonCanvas.js";

const SHELF_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function shelfLetter(index) {
  const i = Math.max(0, Math.floor(Number(index) || 0));
  return SHELF_LETTERS[i] ?? String(i + 1);
}

/** Physical gondola halves store planogram/segments on face A; true double-sided uses A/B. */
export function segmentFaceIdForShelf(shelf, merchandisingFaceId = "A") {
  if (shelf?.pairId && !shelf?.pairDisplay) return "A";
  return merchandisingFaceId === "B" ? "B" : "A";
}

/** Legacy double-letter suffix (AA, AB) — kept for parsing old labels. */
export function labelIndexToSuffix(labelIndex) {
  const i = Math.max(0, Math.floor(Number(labelIndex) || 0));
  return `${shelfLetter(Math.floor(i / 26))}${shelfLetter(i % 26)}`;
}

/** Aisle-centric label, e.g. aisle 4, index 0 → "4A"; index 1 → "4B" */
export function aisleShelfLabel(aisleNumber, labelIndex, convention = null) {
  return formatShelfCode(aisleNumber, labelIndex, convention || undefined);
}

export function shelfFaceDisplayLabel(shelf, aisles) {
  const aisle = (aisles || []).find((a) => a.id === shelf?.aisleId);
  const n = aisle?.aisleNumber;
  const idx = shelf?.shelfIndexAlongAisle;
  if (n != null && idx != null) return aisleShelfLabel(n, idx);
  return null;
}

export function aisleDisplayLabel(aisle) {
  const n = aisle?.aisleNumber;
  return n != null ? String(n) : aisle?.name || "—";
}

function canvasFaceLabelFallback(shelf, faceId) {
  const num = shelf?.displayNumber;
  if (num != null) {
    if (shelf?.pairDisplay) return `${shelfUnitLabel(num)}${faceDigit(faceId)}`;
    if (isPairedShelf(shelf)) return shelfFaceLabel(num, faceId === "B" ? "B" : pairFaceId(shelf));
    return shelfFaceLabel(num, faceId);
  }
  return String(faceDigit(faceId));
}

export function shelfCanvasFaceLabel(shelf, faceId, aisles, allShelves) {
  if (shelf?.pairDisplay && shelf?.pairShelfIds) {
    const physId = faceId === "B" ? shelf.pairShelfIds.back : shelf.pairShelfIds.front;
    const phys = (allShelves || []).find((s) => s.id === physId);
    if (phys) {
      const lbl = shelfFaceDisplayLabel(phys, aisles);
      if (lbl) return lbl;
      return canvasFaceLabelFallback(phys, faceId);
    }
  }
  const lbl = shelfFaceDisplayLabel(shelf, aisles);
  if (lbl) return lbl;
  return canvasFaceLabelFallback(shelf, faceId);
}

export function displayNumberToLetter(displayNumber) {
  let n = Math.max(1, Math.floor(Number(displayNumber) || 1));
  let s = "";
  while (n > 0) {
    n -= 1;
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26);
  }
  return s;
}

export function faceDigit(faceId = "A") {
  return faceId === "B" ? 2 : 1;
}

export function shelfUnitLabel(displayNumber) {
  return displayNumberToLetter(displayNumber);
}

export function shelfFaceLabel(displayNumber, faceId = "A") {
  return `${displayNumberToLetter(displayNumber)}${faceDigit(faceId)}`;
}

/** Paired front/back shelves: front → A (1), back → B (2). */
export function pairFaceId(shelf) {
  return shelf?.pairRole === "back" ? "B" : "A";
}

export function isPairedShelf(shelf) {
  return Boolean(shelf?.pairId) || shelf?.pairRole === "front" || shelf?.pairRole === "back";
}

export function isDoubleSided(shelf) {
  if (isPairedShelf(shelf) && !shelf?.pairDisplay) return false;
  if (shelf?.pairDisplay) return true;
  return shelf?.doubleSided !== false;
}

export function shelfDisplayLabel(shelf, aisles) {
  const aisleLabel = shelfFaceDisplayLabel(shelf, aisles);
  if (aisleLabel) return aisleLabel;
  const num = shelf?.displayNumber;
  if (!num) return "—";
  if (shelf?.pairDisplay) return shelfUnitLabel(num);
  if (isPairedShelf(shelf)) return shelfFaceLabel(num, pairFaceId(shelf));
  if (isDoubleSided(shelf)) return shelfUnitLabel(num);
  return shelfFaceLabel(num, "A");
}

function faceFromShelf(shelf, faceId = "A") {
  const existing = shelf?.faces?.find((f) => f.id === faceId) || shelf?.faces?.[0];
  const legacyPlanogram = faceId === "A" ? shelf?.planogram : [];
  const planogram =
    existing?.planogram?.length ? existing.planogram : Array.isArray(legacyPlanogram) ? legacyPlanogram : [];
  return {
    id: faceId,
    categoryId: existing?.categoryId ?? shelf?.categoryId ?? null,
    color: existing?.color ?? shelf?.color,
    planogram,
    segments: existing?.segments ?? (faceId === "A" ? shelf?.segments : undefined),
    levelSegments: existing?.levelSegments,
  };
}

/** Planogram rows on one physical shelf record. Gondola halves always use face A. */
export function planogramRowsOnPhysicalShelf(shelf, faceId = "A") {
  if (!shelf) return [];
  const norm = normalizeShelfUI(shelf);
  const id = faceId === "B" ? "B" : "A";
  const face = norm.faces?.find((f) => f.id === id) || (id === "A" ? norm.faces?.[0] : null);
  if (face?.planogram?.length) return face.planogram;
  if (id === "A" && norm.planogram?.length) return norm.planogram;
  return [];
}

/** Physical shelf record that owns planogram data for a merchandising face in 3D. */
export function physicalShelfForMerchandisingFace(sceneShelf, layout, merchandisingFaceId = "A") {
  const shelves = layout?.shelves?.length ? layout.shelves : layout?.fixtures || [];
  const id = merchandisingFaceId === "B" ? "B" : "A";
  if (sceneShelf?.pairDisplay && sceneShelf?.pairShelfIds) {
    const physId = id === "B" ? sceneShelf.pairShelfIds.back : sceneShelf.pairShelfIds.front;
    return shelves.find((s) => s.id === physId) || sceneShelf;
  }
  if (sceneShelf?.id) {
    return shelves.find((s) => s.id === sceneShelf.id) || sceneShelf;
  }
  return sceneShelf;
}

/** Face id used for segments/planogram on the physical shelf (gondola halves → always A). */
export function storageFaceIdForScene3D(sceneShelf, merchandisingFaceId = "A") {
  if (sceneShelf?.pairDisplay || (isPairedShelf(sceneShelf) && !sceneShelf?.pairDisplay)) {
    return "A";
  }
  return merchandisingFaceId === "B" ? "B" : "A";
}

/** Exact planogram rows for 3D — same physical record + face the planogram editor writes to. */
export function planogramForSceneFace(sceneShelf, merchandisingFaceId = "A", layout = null) {
  const storageFaceId = storageFaceIdForScene3D(sceneShelf, merchandisingFaceId);
  const phys = physicalShelfForMerchandisingFace(sceneShelf, layout, merchandisingFaceId);
  let rows = planogramRowsOnPhysicalShelf(phys, storageFaceId);
  if (rows.length) return rows;

  const id = merchandisingFaceId === "B" ? "B" : "A";
  const norm = normalizeShelfUI(sceneShelf);
  const mergedFace = norm.faces?.find((f) => f.id === id);
  if (mergedFace?.planogram?.length) return mergedFace.planogram;
  if (id === "A" && norm.planogram?.length) return norm.planogram;
  return [];
}

/** Planogram rows for one merchandising face — prefers face data, falls back to legacy shelf.planogram. */
export function planogramForMerchandisingFace(shelf, faceId = "A", layout = null) {
  const id = faceId === "B" ? "B" : "A";
  const norm = normalizeShelfUI(shelf);

  const mergedFace = norm.faces?.find((f) => f.id === id);
  if (mergedFace?.planogram?.length) return mergedFace.planogram;

  if (norm.pairDisplay && norm.pairShelfIds && layout) {
    const physId = id === "B" ? norm.pairShelfIds.back : norm.pairShelfIds.front;
    const shelves = layout.shelves?.length ? layout.shelves : layout.fixtures || [];
    const phys = shelves.find((s) => s.id === physId);
    if (phys) {
      const rows = planogramRowsOnPhysicalShelf(phys, "A");
      if (rows.length) return rows;
    }
  }

  if (isPairedShelf(norm) && !norm.pairDisplay) {
    return planogramRowsOnPhysicalShelf(norm, "A");
  }

  const face = norm.faces?.find((f) => f.id === id);
  if (face?.planogram?.length) return face.planogram;
  if (id === "A" && norm.planogram?.length) return norm.planogram;
  return [];
}


export function normalizeShelfUI(shelf) {
  if (!shelf) return shelf;
  if (isPairedShelf(shelf) && !shelf.pairDisplay) {
    return {
      ...shelf,
      doubleSided: false,
      pairRole: shelf.pairRole === "back" ? "back" : "front",
      faces: [faceFromShelf(shelf, "A")],
    };
  }
  if (!isDoubleSided(shelf)) {
    const face = faceFromShelf(shelf, "A");
    return { ...shelf, faces: shelf.faces?.length ? shelf.faces : [face] };
  }

  return {
    ...shelf,
    doubleSided: true,
    faces: [faceFromShelf(shelf, "A"), faceFromShelf(shelf, "B")],
  };
}

/** Merge front+back pair into one joined gondola unit (4A | spine | 5A). */
export function mergePairedShelfForCanvas(front, back) {
  const f = normalizeShelfUI(front);
  const b = normalizeShelfUI(back);
  const faceA = faceFromShelf(f, "A");
  const faceB = faceFromShelf(b, "A");
  faceB.id = "B";
  const aabb = gondolaCanvasAabb(f, b);
  return {
    ...f,
    x: aabb.x,
    y: aabb.y,
    canvasOriginX: aabb.originX,
    canvasOriginY: aabb.originY,
    canvasAabbW: aabb.w,
    canvasAabbD: aabb.d,
    rotationDeg: f.rotationDeg,
    doubleSided: true,
    pairDisplay: true,
    pairId: f.pairId || b.pairId,
    pairShelfIds: { front: f.id, back: b.id },
    pairOrigins: { front: { x: f.x, y: f.y }, back: { x: b.x, y: b.y } },
    aisleId: f.aisleId,
    facingAisleId: f.aisleId,
    rearAisleId: b.aisleId,
    faces: [faceA, faceB],
  };
}

/** Merchandising face (2D/3D) for a shelf record — gondola halves map from pairRole. */
export function merchandisingFaceId(shelf, editorFaceId = "A") {
  if (isPairedShelf(shelf) && !shelf?.pairDisplay) {
    return shelf.pairRole === "back" ? "B" : "A";
  }
  return editorFaceId === "B" ? "B" : "A";
}

/** Face id for planogram API / segments on this shelf record. */
export function planogramEditorFaceId(shelf, merchandisingFaceId = "A") {
  if (isPairedShelf(shelf) && !shelf?.pairDisplay) return "A";
  return merchandisingFaceId === "B" ? "B" : "A";
}

/** Resolve shelf for planogram editor — always the clicked physical shelf (aisle-bound). */
export function resolveGondolaForEditor(layout, shelfId) {
  const shelves = layout?.shelves?.length ? layout.shelves : layout?.fixtures || [];
  const shelf = shelves.find((s) => s.id === shelfId);
  if (!shelf) return null;

  return {
    mode: "single",
    shelf: normalizeShelfUI(shelf),
    physicalShelfId: () => shelfId,
    apiFaceId: (faceId) => planogramEditorFaceId(shelf, faceId),
  };
}

/** Count gondola units (front+back pairs count as one). */
export function countGondolaUnits(shelves) {
  const seen = new Set();
  let units = 0;
  for (const s of shelves || []) {
    if (s.pairId) {
      if (seen.has(s.pairId)) continue;
      seen.add(s.pairId);
    }
    units += 1;
  }
  return units;
}

/** Parse aisle-centric label e.g. "9AA" → { aisleNumber, shelfIndex }; legacy "4A" still supported. */
export function parseShelfLabel(label) {
  const s = String(label || "").trim().toUpperCase();
  let m = s.match(/^(\d+)([A-Z]{2})$/);
  if (m) {
    const a = m[2].charCodeAt(0) - 65;
    const b = m[2].charCodeAt(1) - 65;
    return { aisleNumber: Number(m[1]), shelfIndex: a * 26 + b };
  }
  m = s.match(/^(\d+)([A-Z])$/);
  if (m) {
    return { aisleNumber: Number(m[1]), shelfIndex: m[2].charCodeAt(0) - 65 };
  }
  return null;
}

/** All aisle-centric labels in layout for go-to typeahead. */
export function listShelfLabels(layout) {
  const aisles = layout?.aisles || [];
  const shelves = layout?.shelves?.length ? layout.shelves : layout?.fixtures || [];
  const labels = [];
  for (const s of shelves) {
    let lbl = shelfFaceDisplayLabel(s, aisles);
    if (!lbl && s.displayNumber != null) {
      lbl = isPairedShelf(s)
        ? shelfFaceLabel(s.displayNumber, pairFaceId(s))
        : shelfUnitLabel(s.displayNumber);
    }
    if (lbl && !labels.some((x) => x.label === lbl)) {
      labels.push({ label: lbl, shelfId: s.id });
    }
  }
  return labels.sort((a, b) => {
    const pa = parseShelfLabel(a.label);
    const pb = parseShelfLabel(b.label);
    if (!pa || !pb) return a.label.localeCompare(b.label);
    return pa.aisleNumber - pb.aisleNumber || pa.shelfIndex - pb.shelfIndex;
  });
}

function resolveShelfFromPhysical(layout, phys) {
  if (!phys) return null;
  let frontId = phys.id;
  let backId = null;
  let mergedGondola = false;
  const shelves = layout?.shelves?.length ? layout.shelves : layout?.fixtures || [];
  if (phys.pairId) {
    const mate = shelves.find((s) => s.pairId === phys.pairId && s.id !== phys.id);
    if (mate) {
      mergedGondola = true;
      const front = phys.pairRole === "back" ? mate : phys;
      const back = phys.pairRole === "back" ? phys : mate;
      frontId = front.id;
      backId = back.id;
    }
  }
  const aisles = layout?.aisles || [];
  return {
    shelfId: phys.id,
    frontId,
    backId,
    mergedGondola,
    displayLabel: shelfFaceDisplayLabel(phys, aisles) || shelfDisplayLabel(phys, aisles),
  };
}

/** Resolve "4A" → physical shelf + optional gondola pair ids. */
export function resolveShelfByLabel(layout, label) {
  const normalized = String(label || "").trim().toUpperCase();
  if (!normalized) return null;

  const parsed = parseShelfLabel(normalized);
  if (parsed) {
    const aisles = layout?.aisles || [];
    const shelves = layout?.shelves?.length ? layout.shelves : layout?.fixtures || [];
    const aisleIds = new Set(
      aisles.filter((a) => Number(a.aisleNumber) === parsed.aisleNumber).map((a) => a.id)
    );
    if (!aisleIds.size) return null;

    const phys = shelves.find(
      (s) =>
        aisleIds.has(s.aisleId) && Number(s.shelfIndexAlongAisle) === parsed.shelfIndex
    );
    if (!phys) return null;
    return resolveShelfFromPhysical(layout, phys);
  }

  const fromList = listShelfLabels(layout).find((o) => o.label.toUpperCase() === normalized);
  if (fromList) {
    const shelves = layout?.shelves?.length ? layout.shelves : layout?.fixtures || [];
    const phys = shelves.find((s) => s.id === fromList.shelfId);
    return resolveShelfFromPhysical(layout, phys);
  }

  return null;
}

/** Group planogram rows by levelIndex for tooltip display. */
export function groupPlanogramByLevel(planogram, levels) {
  const levelList =
    levels?.length > 0
      ? levels.map((lv) => Number(lv.levelIndex ?? 0))
      : [...new Set((planogram || []).map((p) => Number(p.levelIndex) || 0))].sort((a, b) => a - b);
  if (!levelList.length) levelList.push(0);

  return levelList.map((levelIndex) => ({
    levelIndex,
    products: (planogram || []).filter((p) => Number(p.levelIndex) === levelIndex),
  }));
}

/** Shelves to render in 3D — one entry per gondola unit. */
export function shelvesForScene3D(shelves) {
  const list = shelves || [];
  const seen = new Set();
  const out = [];
  for (const s of list) {
    if (s.pairId) {
      if (seen.has(s.pairId)) continue;
      seen.add(s.pairId);
      const front = list.find((x) => x.pairId === s.pairId && x.pairRole !== "back") || s;
      const back = list.find((x) => x.pairId === s.pairId && x.pairRole === "back");
      if (back) {
        out.push(mergePairedShelfForCanvas(front, back));
        continue;
      }
    }
    out.push(normalizeShelfUI(s));
  }
  return out;
}
