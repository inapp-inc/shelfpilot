/** Dual-face shelf helpers: normalize legacy ↔ faces[], display numbers. */

export function isDoubleSidedType(type) {
  return type === "gondola";
}

export function nextDisplayNumber(shelves) {
  const nums = (shelves || []).map((s) => Number(s.displayNumber) || 0);
  return nums.length ? Math.max(...nums) + 1 : 1;
}

export function assignDisplayNumbers(shelves) {
  return (shelves || []).map((shelf, idx) => ({
    ...shelf,
    displayNumber: idx + 1,
  }));
}

export function buildFacesFromLegacy(shelf) {
  const categoryId = shelf.categoryId || null;
  const color = shelf.color;
  const planogram = Array.isArray(shelf.planogram) ? [...shelf.planogram] : [];
  const doubleSided = shelf.doubleSided ?? isDoubleSidedType(shelf.type);
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
  const doubleSided = shelf.doubleSided ?? isDoubleSidedType(shelf.type);
  shelf.doubleSided = doubleSided;
  if (!Array.isArray(shelf.faces) || !shelf.faces.length) {
    shelf.faces = buildFacesFromLegacy(shelf);
  }
  syncLegacyFromFaces(shelf);
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
    const doubleSided = shelf.doubleSided ?? isDoubleSidedType(shelf.type);
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
