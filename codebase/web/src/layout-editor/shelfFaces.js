/** Client-side shelf face normalization (mirrors API shelfFaces). */

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

export function shelfDisplayLabel(shelf) {
  const num = shelf?.displayNumber;
  if (!num) return "—";
  if (shelf?.pairDisplay) return shelfUnitLabel(num);
  if (isPairedShelf(shelf)) return shelfFaceLabel(num, pairFaceId(shelf));
  if (isDoubleSided(shelf)) return shelfUnitLabel(num);
  return shelfFaceLabel(num, "A");
}

function faceFromShelf(shelf, faceId = "A") {
  const existing = shelf?.faces?.find((f) => f.id === faceId) || shelf?.faces?.[0];
  return {
    id: faceId,
    categoryId: existing?.categoryId ?? shelf?.categoryId ?? null,
    color: existing?.color ?? shelf?.color,
    planogram: existing?.planogram ?? (faceId === "A" ? shelf?.planogram : []) ?? [],
    segments: existing?.segments ?? (faceId === "A" ? shelf?.segments : undefined),
    levelSegments: existing?.levelSegments,
  };
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

/** Merge front+back pair into one joined gondola unit (A1 | spine | A2). */
export function mergePairedShelfForCanvas(front, back) {
  const f = normalizeShelfUI(front);
  const b = normalizeShelfUI(back);
  const faceA = faceFromShelf(f, "A");
  const faceB = faceFromShelf(b, "A");
  faceB.id = "B";
  return {
    ...f,
    x: f.x,
    y: f.y,
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

/** Resolve paired gondola for planogram editor — one UI, two physical shelf records. */
export function resolveGondolaForEditor(layout, shelfId) {
  const shelves = layout?.shelves?.length ? layout.shelves : layout?.fixtures || [];
  const shelf = shelves.find((s) => s.id === shelfId);
  if (!shelf) return null;

  if (!shelf.pairId) {
    return {
      mode: "single",
      shelf: normalizeShelfUI(shelf),
      physicalShelfId: () => shelfId,
      apiFaceId: (faceId) => (faceId === "B" ? "B" : "A"),
    };
  }

  const front =
    shelves.find((s) => s.pairId === shelf.pairId && s.pairRole !== "back") || shelf;
  const back = shelves.find((s) => s.pairId === shelf.pairId && s.pairRole === "back");
  if (!back) {
    return {
      mode: "single",
      shelf: normalizeShelfUI(shelf),
      physicalShelfId: () => shelfId,
      apiFaceId: () => "A",
    };
  }

  return {
    mode: "gondola",
    shelf: mergePairedShelfForCanvas(front, back),
    physicalShelfId: (faceId) => (faceId === "B" ? back.id : front.id),
    apiFaceId: () => "A",
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
