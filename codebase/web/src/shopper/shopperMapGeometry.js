import { aisleFootprintMeters, shelfRotatedCorners } from "../layout-editor/polygonCanvas.js";
import {
  isDoubleSided,
  mergePairedShelfForCanvas,
  shelfCanvasFaceLabel,
  shelvesForScene3D,
} from "../layout-editor/shelfFaces.js";

function normalizeDeg(deg) {
  return ((Number(deg) || 0) % 360 + 360) % 360;
}

/** Gondola face split follows shelf rotation (matches 2D / 3D). */
export function gondolaSplitAlongWidth(rotationDeg) {
  const n = normalizeDeg(rotationDeg);
  return n === 90 || n === 270;
}

function polygonCentroid(corners) {
  if (!corners?.length) return { x: 0, y: 0 };
  const x = corners.reduce((s, c) => s + c.x, 0) / corners.length;
  const y = corners.reduce((s, c) => s + c.y, 0) / corners.length;
  return { x, y };
}

function cornersToPoints(corners) {
  return corners.map((c) => `${c.x},${c.y}`).join(" ");
}

/** Split one double-sided fixture into face A / face B polygons (matches 2D editor). */
export function splitDualShelfFaces(corners, rotationDeg) {
  if (!corners?.length || corners.length < 4) {
    return { faceA: corners, faceB: corners, spine: null };
  }
  const [c0, c1, c2, c3] = corners;
  const mid03 = { x: (c0.x + c3.x) / 2, y: (c0.y + c3.y) / 2 };
  const mid12 = { x: (c1.x + c2.x) / 2, y: (c1.y + c2.y) / 2 };
  const mid01 = { x: (c0.x + c1.x) / 2, y: (c0.y + c1.y) / 2 };
  const mid23 = { x: (c2.x + c3.x) / 2, y: (c2.y + c3.y) / 2 };

  if (gondolaSplitAlongWidth(rotationDeg)) {
    return {
      faceA: [c0, mid01, mid23, c3],
      faceB: [mid01, c1, c2, mid23],
      spine: [mid01, mid23],
    };
  }
  return {
    faceA: [c0, c1, mid12, mid03],
    faceB: [mid03, mid12, c2, c3],
    spine: [mid03, mid12],
  };
}

/** Shelves merged for display — same units as layout editor / 3D. */
export function displayShelvesForMap(layout) {
  const raw = layout?.shelves?.length ? layout.shelves : layout?.fixtures || [];
  return shelvesForScene3D(raw);
}

function resolveGondolaHalves(unit, allShelves) {
  if (!unit?.pairDisplay || !unit.pairShelfIds) return { front: unit, back: null };
  const front = allShelves.find((s) => s.id === unit.pairShelfIds.front) || unit;
  const back = allShelves.find((s) => s.id === unit.pairShelfIds.back) || null;
  return { front, back };
}

function gondolaSpineLine(frontCorners, backCorners) {
  if (!frontCorners?.length || !backCorners?.length) return null;
  const a = polygonCentroid(frontCorners);
  const b = polygonCentroid(backCorners);
  return [a, b];
}

/** @returns map render units with one or two labelled faces per fixture. */
export function shelfMapUnits(layout) {
  const allShelves = layout?.shelves?.length ? layout.shelves : layout?.fixtures || [];
  const aisles = layout?.aisles || [];
  const units = displayShelvesForMap(layout);

  return units.map((unit) => {
    const highlightIds = new Set([unit.id]);
    if (unit.pairShelfIds?.front) highlightIds.add(unit.pairShelfIds.front);
    if (unit.pairShelfIds?.back) highlightIds.add(unit.pairShelfIds.back);

    if (unit.pairDisplay && unit.pairShelfIds?.back) {
      const { front, back } = resolveGondolaHalves(unit, allShelves);
      const frontCorners = shelfRotatedCorners(front);
      const backCorners = back ? shelfRotatedCorners(back) : frontCorners;
      const labelA = shelfCanvasFaceLabel(unit, "A", aisles, allShelves);
      const labelB = shelfCanvasFaceLabel(unit, "B", aisles, allShelves);
      return {
        id: unit.id,
        kind: "gondola",
        pairShelfIds: unit.pairShelfIds,
        corners: [...frontCorners, ...backCorners],
        faces: [
          { id: "A", shelfId: unit.pairShelfIds.front, corners: frontCorners, label: labelA, at: polygonCentroid(frontCorners) },
          { id: "B", shelfId: unit.pairShelfIds.back, corners: backCorners, label: labelB, at: polygonCentroid(backCorners) },
        ],
        spine: gondolaSpineLine(frontCorners, backCorners),
        label: `${labelA} · ${labelB}`,
        labelAt: polygonCentroid([...frontCorners, ...backCorners]),
        highlightIds,
        rotationDeg: unit.rotationDeg,
      };
    }

    const corners = shelfRotatedCorners(unit);
    const labelA = shelfCanvasFaceLabel(unit, "A", aisles, allShelves);
    const dual = isDoubleSided(unit);

    if (dual) {
      const { faceA, faceB, spine } = splitDualShelfFaces(corners, unit.rotationDeg);
      const labelB = shelfCanvasFaceLabel(unit, "B", aisles, allShelves);
      return {
        id: unit.id,
        kind: "dual",
        pairShelfIds: null,
        corners,
        faces: [
          { id: "A", shelfId: unit.id, corners: faceA, label: labelA, at: polygonCentroid(faceA) },
          { id: "B", shelfId: unit.id, corners: faceB, label: labelB, at: polygonCentroid(faceB) },
        ],
        spine,
        label: `${labelA} · ${labelB}`,
        labelAt: polygonCentroid(corners),
        highlightIds,
        rotationDeg: unit.rotationDeg,
        dual: true,
      };
    }

    return {
      id: unit.id,
      kind: "single",
      pairShelfIds: null,
      corners,
      faces: [{ id: "A", shelfId: unit.id, corners, label: labelA, at: polygonCentroid(corners) }],
      spine: null,
      label: labelA,
      labelAt: polygonCentroid(corners),
      highlightIds,
      rotationDeg: unit.rotationDeg,
      dual: false,
    };
  });
}

export function aisleMapUnits(layout) {
  return (layout?.aisles || []).map((aisle) => {
    const fp = aisleFootprintMeters(aisle, layout);
    const cx = fp.x + fp.w / 2;
    const cy = fp.y + fp.d / 2;
    const label = aisle.aisleNumber != null ? String(aisle.aisleNumber) : aisle.name || "";
    return {
      id: aisle.id,
      footprint: fp,
      center: { x: cx, y: cy },
      label,
      orientation: aisle.orientation,
    };
  });
}

export { cornersToPoints, polygonCentroid, shelfRotatedCorners, mergePairedShelfForCanvas };
