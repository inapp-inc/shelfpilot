/**
 * Aisle-centric shelf labels — delegates bay formatting to shared labelFormat.mjs (FR-NAME-01).
 */
import { aisleFootprint } from "./polygonContainment.js";
import { shelfCenter } from "./aisleBinding.js";
import { syncPairedShelfFootprints } from "./shelfFaces.js";
import {
  DEFAULT_NAMING_CONVENTION,
  formatShelfCode,
  resolveNamingConvention,
  shelfLetter,
} from "../../../shared/labelFormat.mjs";

export { shelfLetter };

/** Map 0 → AA, 1 → AB, 26 → BA, etc. */
export function labelIndexToSuffix(labelIndex) {
  const i = Math.max(0, Math.floor(Number(labelIndex) || 0));
  return `${shelfLetter(Math.floor(i / 26))}${shelfLetter(i % 26)}`;
}

/** e.g. aisle 4, label index 0 → "4A" using layout/vertical naming convention when provided. */
export function aisleShelfLabel(aisleNumber, labelIndex, convention = DEFAULT_NAMING_CONVENTION) {
  return formatShelfCode(aisleNumber, labelIndex, convention);
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

/** Assign shelfIndexAlongAisle (0→A) per physical shelf on its bound aisle. */
export function assignAisleShelfLabels(shelves, aisles, layout) {
  const aisleById = new Map((aisles || []).map((a) => [a.id, a]));
  const byAisle = new Map();

  for (const s of shelves || []) {
    const aid = s.aisleId;
    if (!aid) continue;
    if (!byAisle.has(aid)) byAisle.set(aid, []);
    byAisle.get(aid).push(s);
  }

  const indexByShelfId = new Map();
  for (const [, aisleShelves] of byAisle) {
    aisleShelves.sort(
      (a, b) =>
        shelfProjectionOnAisle(a, aisleById.get(a.aisleId), layout) -
        shelfProjectionOnAisle(b, aisleById.get(b.aisleId), layout)
    );
    aisleShelves.forEach((s, slot) => {
      indexByShelfId.set(s.id, slot);
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

export function shelfDisplayLabelFromAisle(shelf, aisles, layout = null, verticalConfig = null) {
  const aisle = (aisles || []).find((a) => a.id === shelf?.aisleId);
  const n = aisle?.aisleNumber;
  const idx = shelf?.shelfIndexAlongAisle;
  if (n != null && idx != null) {
    const convention = resolveNamingConvention(layout, verticalConfig);
    return aisleShelfLabel(n, idx, convention);
  }
  return null;
}

/** Snap fixture positions to 5 cm grid for alignment. */
export function quantizeFixturePositions(shelves) {
  const q = (v) => Math.round(Number(v) * 20) / 20;
  const snapped = (shelves || []).map((s) => ({
    ...s,
    x: q(s.x),
    y: q(s.y),
  }));
  // Re-derive pair backs from snapped fronts so faces stay on one footprint.
  return syncPairedShelfFootprints(snapped);
}

export function quantizeAislePositions(aisles) {
  const q = (v) => Math.round(Number(v) * 20) / 20;
  return (aisles || []).map((a) => ({
    ...a,
    x: q(a.x),
    y: q(a.y),
  }));
}
