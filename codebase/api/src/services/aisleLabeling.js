/**
 * Aisle-centric shelf labels: aisle 4 → 4A, 4B; back face uses opposite aisle number.
 */
import { aisleFootprint } from "./polygonContainment.js";
import { shelfCenter } from "./aisleBinding.js";

const SHELF_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function shelfLetter(index) {
  const i = Math.max(0, Math.floor(Number(index) || 0));
  return SHELF_LETTERS[i] ?? String(i + 1);
}

/** e.g. aisle 4, second unit → "4B" */
export function aisleShelfLabel(aisleNumber, shelfIndexAlongAisle) {
  const n = Number(aisleNumber);
  if (!Number.isFinite(n) || n < 1) return "—";
  return `${n}${shelfLetter(shelfIndexAlongAisle ?? 0)}`;
}

function aisleSortKey(aisle, layout) {
  const entry = layout?.entryPoints?.[0];
  const ex = entry ? Number(entry.x) : 0;
  const ey = entry ? Number(entry.y) : 0;
  const fp = aisleFootprint(aisle, layout);
  const cx = fp.x + fp.w / 2;
  const cy = fp.y + fp.d / 2;
  const dx = cx - ex;
  const dy = cy - ey;
  if (aisle.orientation === "vertical") {
    return dx * 1000 + dy;
  }
  return dy * 1000 + dx;
}

function shelfProjectionOnAisle(shelf, aisle, layout) {
  const center = shelfCenter(shelf);
  const fp = aisleFootprint(aisle, layout);
  if (aisle.orientation === "vertical") {
    return center.y - fp.y;
  }
  return center.x - fp.x;
}

/** Assign 1-based aisleNumber along primary flow from entry point. */
export function assignAisleNumbers(aisles, layout) {
  const walk = (aisles || []).filter((a) => a?.id && a.id !== "aisle-check");
  const sorted = [...walk].sort((a, b) => aisleSortKey(a, layout) - aisleSortKey(b, layout));
  const numById = new Map(sorted.map((a, i) => [a.id, i + 1]));
  return (aisles || []).map((a) => {
    if (!a?.id || a.id === "aisle-check") return a;
    const n = numById.get(a.id);
    return n != null ? { ...a, aisleNumber: n } : { ...a, aisleNumber: a.aisleNumber ?? null };
  });
}

/** Assign shelfIndexAlongAisle (0→A) per aisle-bound shelf unit. */
export function assignAisleShelfLabels(shelves, aisles, layout) {
  const aisleById = new Map((aisles || []).map((a) => [a.id, a]));
  const units = [];
  const seenPairs = new Set();

  for (const s of shelves || []) {
    if (s.pairId) {
      if (seenPairs.has(s.pairId)) continue;
      seenPairs.add(s.pairId);
      const front =
        (shelves || []).find((x) => x.pairId === s.pairId && x.pairRole !== "back") || s;
      units.push({ front, pairId: s.pairId });
    } else {
      units.push({ front: s, pairId: null });
    }
  }

  const byAisle = new Map();
  for (const u of units) {
    const aid = u.front.aisleId;
    if (!aid) continue;
    if (!byAisle.has(aid)) byAisle.set(aid, []);
    byAisle.get(aid).push(u);
  }

  const indexByShelfId = new Map();
  for (const [aisleId, aisleUnits] of byAisle) {
    const aisle = aisleById.get(aisleId);
    if (!aisle) continue;
    aisleUnits.sort(
      (a, b) =>
        shelfProjectionOnAisle(a.front, aisle, layout) -
        shelfProjectionOnAisle(b.front, aisle, layout)
    );
    aisleUnits.forEach((u, idx) => {
      indexByShelfId.set(u.front.id, idx);
      if (u.pairId) {
        const back = (shelves || []).find(
          (x) => x.pairId === u.pairId && x.pairRole === "back"
        );
        if (back) indexByShelfId.set(back.id, idx);
      }
    });
  }

  return (shelves || []).map((s) => ({
    ...s,
    shelfIndexAlongAisle: indexByShelfId.has(s.id)
      ? indexByShelfId.get(s.id)
      : s.shelfIndexAlongAisle ?? null,
  }));
}

/** Apply aisle numbers + shelf indices after aisle binding. */
export function finalizeAisleLabeling(shelves, aisles, layout) {
  const numberedAisles = assignAisleNumbers(aisles, layout);
  const labeledShelves = assignAisleShelfLabels(shelves, numberedAisles, layout);
  return { shelves: labeledShelves, aisles: numberedAisles };
}

export function shelfDisplayLabelFromAisle(shelf, aisles) {
  const aisle = (aisles || []).find((a) => a.id === shelf?.aisleId);
  const n = aisle?.aisleNumber;
  const idx = shelf?.shelfIndexAlongAisle;
  if (n != null && idx != null) return aisleShelfLabel(n, idx);
  return null;
}

/** Snap fixture positions to 5 cm grid for alignment. */
export function quantizeFixturePositions(shelves) {
  const q = (v) => Math.round(Number(v) * 20) / 20;
  return (shelves || []).map((s) => ({
    ...s,
    x: q(s.x),
    y: q(s.y),
  }));
}

export function quantizeAislePositions(aisles) {
  const q = (v) => Math.round(Number(v) * 20) / 20;
  return (aisles || []).map((a) => ({
    ...a,
    x: q(a.x),
    y: q(a.y),
  }));
}
