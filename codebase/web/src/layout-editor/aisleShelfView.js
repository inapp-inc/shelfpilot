/**
 * FR-VIEW-01 — flat adjacent / opposite shelf strips keyed by aisleId + shelf index.
 */
import {
  aisleDisplayLabel,
  normalizeShelfUI,
  planogramRowsOnPhysicalShelf,
  shelfFaceDisplayLabel,
} from "./shelfFaces.js";

function sortByAisleIndex(a, b) {
  const ia = a.shelfIndexAlongAisle;
  const ib = b.shelfIndexAlongAisle;
  if (ia != null && ib != null && ia !== ib) return ia - ib;
  if (ia != null && ib == null) return -1;
  if (ia == null && ib != null) return 1;
  return String(a.id).localeCompare(String(b.id));
}

export function oppositeMateShelf(shelf, allShelves) {
  if (!shelf?.pairId) return null;
  return (allShelves || []).find((s) => s.pairId === shelf.pairId && s.id !== shelf.id) || null;
}

export function shelvesOnAisle(layout, aisleId) {
  if (!aisleId) return [];
  const shelves = (layout?.shelves || layout?.fixtures || []).filter((s) => s && !s.pairDisplay);
  return shelves.filter((s) => s.aisleId === aisleId).sort(sortByAisleIndex);
}

function slotFromShelf(shelf, layout, allShelves, focusShelfId) {
  const aisles = layout?.aisles || [];
  const label = shelfFaceDisplayLabel(shelf, aisles) || "—";
  const mate = oppositeMateShelf(shelf, allShelves);
  let opposite = null;
  if (mate) {
    const mateAisle = aisles.find((a) => a.id === mate.aisleId);
    opposite = {
      shelfId: mate.id,
      aisleId: mate.aisleId,
      aisleNumber: mateAisle?.aisleNumber ?? null,
      aisleLabel: mateAisle ? aisleDisplayLabel(mateAisle) : null,
      label: shelfFaceDisplayLabel(mate, aisles) || "—",
    };
  }
  return {
    shelfId: shelf.id,
    label,
    shelfIndexAlongAisle: shelf.shelfIndexAlongAisle,
    isFocus: shelf.id === focusShelfId,
    opposite,
  };
}

/** Build aisle strip model from a focused shelf (e.g. 4B → aisle 4 slots + opposite row). */
export function buildAisleShelfView(layout, focusShelfId) {
  if (!layout || !focusShelfId) return null;
  const allShelves = (layout.shelves || layout.fixtures || []).filter((s) => s && !s.pairDisplay);
  const focus = allShelves.find((s) => s.id === focusShelfId);
  if (!focus?.aisleId) return null;

  const aisle = (layout.aisles || []).find((a) => a.id === focus.aisleId);
  if (!aisle) return null;

  const aisleShelves = shelvesOnAisle(layout, focus.aisleId);
  const slots = aisleShelves.map((s) => slotFromShelf(s, layout, allShelves, focusShelfId));

  const oppositeByAisle = new Map();
  for (const slot of slots) {
    if (!slot.opposite?.aisleId) continue;
    if (!oppositeByAisle.has(slot.opposite.aisleId)) {
      oppositeByAisle.set(slot.opposite.aisleId, {
        aisleId: slot.opposite.aisleId,
        aisleNumber: slot.opposite.aisleNumber,
        aisleLabel: slot.opposite.aisleLabel,
        slots: [],
      });
    }
    oppositeByAisle.get(slot.opposite.aisleId).slots.push({
      ...slot.opposite,
      pairedWithShelfId: slot.shelfId,
      isFocus: slot.opposite.shelfId === focusShelfId,
    });
  }

  for (const row of oppositeByAisle.values()) {
    row.slots.sort((a, b) => {
      const sa = allShelves.find((s) => s.id === a.shelfId);
      const sb = allShelves.find((s) => s.id === b.shelfId);
      return sortByAisleIndex(sa || {}, sb || {});
    });
  }

  return {
    aisleId: aisle.id,
    aisleNumber: aisle.aisleNumber,
    aisleLabel: aisleDisplayLabel(aisle),
    focusShelfId,
    focusLabel: shelfFaceDisplayLabel(focus, layout.aisles) || "—",
    slots,
    oppositeRows: [...oppositeByAisle.values()].sort(
      (a, b) => Number(a.aisleNumber ?? 999) - Number(b.aisleNumber ?? 999)
    ),
  };
}

/** Product summary for a shelf card (read-only strip preview). */
export function shelfStripProducts(shelf, products = [], { max = 6 } = {}) {
  if (!shelf) return [];
  const norm = normalizeShelfUI(shelf);
  const rows = planogramRowsOnPhysicalShelf(norm, "A");
  const byId = new Map((products || []).map((p) => [p.id, p]));
  const seen = new Set();
  const out = [];
  for (const row of rows) {
    if (!row?.productId || seen.has(row.productId)) continue;
    seen.add(row.productId);
    const product = byId.get(row.productId);
    out.push({
      productId: row.productId,
      name: product?.name || row.productId,
      imageUrl: product?.imageUrl || product?.attributes?.imageUrl || null,
    });
    if (out.length >= max) break;
  }
  return out;
}

export function shelfStripCategory(shelf, categories = []) {
  const norm = normalizeShelfUI(shelf);
  const catId = norm.categoryId || norm.faces?.[0]?.categoryId || null;
  if (!catId) return null;
  const cat = (categories || []).find((c) => c.id === catId);
  return { id: catId, name: cat?.name || catId };
}
