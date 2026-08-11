/** Dual-face shelf helpers: normalize legacy ↔ faces[], display numbers. */
import { normalizeRotationDeg, normalizeShelfFaceSegments } from "./shelfSegments.js";

/** 1 → A, 2 → B, … 26 → Z, 27 → AA */
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

/** Face A → 1, Face B → 2 */
export function faceDigit(faceId = "A") {
  return faceId === "B" ? 2 : 1;
}

/** Shelf unit letter only, e.g. displayNumber 2 → "B" */
export function shelfUnitLabel(displayNumber) {
  return displayNumberToLetter(displayNumber);
}

/** Per-face shelf label, e.g. displayNumber 2 + Face B → "B2" */
export function shelfFaceLabel(displayNumber, faceId = "A") {
  return `${displayNumberToLetter(displayNumber)}${faceDigit(faceId)}`;
}

/** All fixture types support Face A / Face B unless explicitly single-sided. */
export function isDoubleSidedType(_type) {
  return true;
}

export function nextDisplayNumber(shelves) {
  const nums = (shelves || []).map((s) => Number(s.displayNumber) || 0);
  return nums.length ? Math.max(...nums) + 1 : 1;
}

/**
 * Front/back pair origin so both shelves share the same floor AABB
 * when the back shelf is rotated +180°.
 */
export function oppositeShelfOrigin(x, y, rotationDeg, widthMeters, depthMeters) {
  const rot = ((Number(rotationDeg) || 0) % 360 + 360) % 360;
  const w = Number(widthMeters) || 1.2;
  const d = Number(depthMeters) || 0.6;
  const rad = (rot * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  return {
    x: Number((x + w * cos - d * sin).toFixed(3)),
    y: Number((y + w * sin + d * cos).toFixed(3)),
    rotationDeg: (rot + 180) % 360,
  };
}

/**
 * Keep front/back of each pair on one shared floor footprint (same W×D, re-derived origin).
 * Call after any step that may move or resize faces independently (quantize, typing).
 */
export function syncPairedShelfFootprints(shelves) {
  if (!shelves?.length) return shelves || [];
  const fronts = new Map();
  for (const s of shelves) {
    if (!s.pairId) continue;
    if (s.pairRole === "front" || (!s.pairRole && !fronts.has(s.pairId))) {
      fronts.set(s.pairId, s);
    }
  }
  return shelves.map((shelf) => {
    if (!shelf.pairId || shelf.pairRole !== "back") return shelf;
    const front = fronts.get(shelf.pairId);
    if (!front) return shelf;
    const w = Number(front.widthMeters ?? front.usableWidthMeters) || 1.2;
    const d = Number(front.depthMeters) || 0.6;
    const origin = oppositeShelfOrigin(front.x, front.y, front.rotationDeg, w, d);
    return normalizeShelf({
      ...shelf,
      x: origin.x,
      y: origin.y,
      rotationDeg: origin.rotationDeg,
      usableWidthMeters: Number(front.usableWidthMeters) || w,
      widthMeters: w,
      depthMeters: d,
      heightMeters: Number(front.heightMeters) || shelf.heightMeters,
      doubleSided: false,
    });
  });
}

/** Face digit for paired shelves: front → 1 (A), back → 2 (B). */
export function pairFaceId(shelf) {
  return shelf?.pairRole === "back" ? "B" : "A";
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

export function assignDisplayNumbers(shelves) {
  const pairUnit = new Map();
  let next = 1;
  return (shelves || []).map((shelf) => {
    if (shelf.pairId) {
      if (!pairUnit.has(shelf.pairId)) {
        pairUnit.set(shelf.pairId, next);
        next += 1;
      }
      return { ...shelf, displayNumber: pairUnit.get(shelf.pairId) };
    }
    const n = next;
    next += 1;
    return { ...shelf, displayNumber: n };
  });
}

export function buildFacesFromLegacy(shelf) {
  const categoryId = shelf.categoryId || null;
  const color = shelf.color;
  const planogram = Array.isArray(shelf.planogram) ? [...shelf.planogram] : [];
  const doubleSided = shelf.doubleSided !== false;
  if (doubleSided) {
    const faceB = shelf.faces?.find((f) => f.id === "B");
    return [
      { id: "A", categoryId, color, planogram },
      {
        id: "B",
        categoryId: faceB?.categoryId ?? categoryId,
        color: faceB?.color ?? color,
        planogram: Array.isArray(faceB?.planogram) ? [...faceB.planogram] : [],
      },
    ];
  }
  return [{ id: "A", categoryId, color, planogram }];
}

export function syncLegacyFromFaces(shelf) {
  const faces = shelf.faces?.length ? shelf.faces : buildFacesFromLegacy(shelf);
  const faceA = faces.find((f) => f.id === "A") || faces[0];
  shelf.faces = faces;
  shelf.categoryId = faceA?.categoryId ?? shelf.categoryId ?? null;
  shelf.color = faceA?.color ?? shelf.color;
  shelf.planogram = Array.isArray(faceA?.planogram) ? faceA.planogram : [];
  return shelf;
}

export function normalizeShelf(shelf) {
  if (!shelf) return shelf;
  // Paired front/back shelves are two physical single-face units.
  const isPaired = Boolean(shelf.pairId) || shelf.pairRole === "front" || shelf.pairRole === "back";
  if (isPaired) {
    shelf.doubleSided = false;
    shelf.pairRole = shelf.pairRole === "back" ? "back" : "front";
  }
  const doubleSided = isPaired ? false : shelf.doubleSided !== false;
  shelf.doubleSided = doubleSided;
  if (doubleSided && Array.isArray(shelf.faces) && shelf.faces.length === 1) {
    shelf.faces = buildFacesFromLegacy(shelf);
  }
  shelf.rotationDeg = normalizeRotationDeg(shelf.rotationDeg);
  if (!Array.isArray(shelf.faces) || !shelf.faces.length) {
    shelf.faces = buildFacesFromLegacy(shelf);
  }
  if (!doubleSided && shelf.faces.length > 1) {
    shelf.faces = [shelf.faces.find((f) => f.id === "A") || shelf.faces[0]];
  }
  syncLegacyFromFaces(shelf);
  normalizeShelfFaceSegments(shelf);
  if (!shelf.displayNumber) shelf.displayNumber = null;
  return shelf;
}

export function getFace(shelf, faceId = "A") {
  normalizeShelf(shelf);
  const id = faceId === "B" ? "B" : "A";
  return shelf.faces.find((f) => f.id === id) || shelf.faces[0];
}

export function faceCategoryId(shelf, faceId = "A") {
  return getFace(shelf, faceId)?.categoryId || null;
}

export function facePlanogram(shelf, faceId = "A") {
  const face = getFace(shelf, faceId);
  if (!face.planogram) face.planogram = [];
  return face.planogram;
}

export function setFaceCategory(shelf, faceId, categoryId, color) {
  normalizeShelf(shelf);
  const face = getFace(shelf, faceId);
  face.categoryId = categoryId || null;
  if (color != null) face.color = color;
  syncLegacyFromFaces(shelf);
  return shelf;
}

/**
 * Assign categories to shelves; gondolas get dual faces (A = slot, B = next slot).
 */
export function applyFacesFromMix(shelves, slots, categories) {
  return shelves.map((shelf, idx) => {
    const mixA = slots[idx];
    const catA = categories.find((c) => c.id === mixA.categoryId);
    const doubleSided = shelf.doubleSided !== false;
    const temperatureZone = mixA.temperatureZone || "ambient";

    if (!doubleSided) {
      return {
        ...shelf,
        doubleSided: false,
        categoryId: mixA.categoryId,
        color: catA?.color || shelf.color,
        temperatureZone,
        faces: [
          {
            id: "A",
            categoryId: mixA.categoryId,
            color: catA?.color || shelf.color,
            planogram: shelf.faces?.find((f) => f.id === "A")?.planogram || shelf.planogram || [],
          },
        ],
      };
    }

    const mixB = slots[(idx + 1) % slots.length];
    const catB = categories.find((c) => c.id === mixB.categoryId);
    const existingA = shelf.faces?.find((f) => f.id === "A");
    const existingB = shelf.faces?.find((f) => f.id === "B");
    return {
      ...shelf,
      doubleSided: true,
      categoryId: mixA.categoryId,
      color: catA?.color || shelf.color,
      temperatureZone,
      faces: [
        {
          id: "A",
          categoryId: mixA.categoryId,
          color: catA?.color || shelf.color,
          planogram: existingA?.planogram || [],
        },
        {
          id: "B",
          categoryId: mixB.categoryId,
          color: catB?.color || catA?.color || shelf.color,
          planogram: existingB?.planogram || [],
        },
      ],
    };
  });
}
