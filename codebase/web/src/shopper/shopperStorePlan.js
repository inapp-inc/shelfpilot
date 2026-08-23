/**
 * Read-only store plan for the kiosk — the same visual model as the layout editor's 2D
 * canvas: fixture-zone floor, aisle corridors, and real rotated shelf footprints with
 * per-face category colours. No pointer handling, so it is read-only by construction.
 */

import { colorForShelfFace, withAlpha } from "../categoryColors.js";
import {
  layoutContentBounds,
  layoutFixtureZoneRect,
  layoutStoreEnvelope,
} from "../layout-editor/polygonCanvas.js";
import {
  centroid,
  runwayBandsForMap,
  shelfLabelVisibleOnMap,
  shelfTilesForMap,
} from "./shopperSchematicMap.js";

const SHELF_FILL_ALPHA = 0.34;
const SHELF_FALLBACK_COLOR = "#94A3B8";
/** Rough glyph advance as a fraction of font size — used to keep labels inside their fixture. */
const GLYPH_ADVANCE = 0.6;

function footprintBox(corners) {
  const xs = (corners || []).map((c) => c.x);
  const ys = (corners || []).map((c) => c.y);
  if (!xs.length) return { w: 0, h: 0, long: 0, short: 0 };
  const w = Math.max(0.05, Math.max(...xs) - Math.min(...xs));
  const h = Math.max(0.05, Math.max(...ys) - Math.min(...ys));
  return { w, h, long: Math.max(w, h), short: Math.min(w, h) };
}

/**
 * Both faces of a gondola carry their own code ("2A" front, "2B" back), but at store scale two
 * labels a shelf-depth apart collide. One combined code per fixture keeps the map readable
 * without losing either bay.
 */
export function combinedFixtureLabel(faces) {
  const labels = (faces || []).map((f) => f.label).filter(Boolean);
  if (labels.length <= 1) return labels[0] || "";
  const parts = labels.map((l) => /^(\d+)([A-Z]+)$/.exec(l));
  if (parts[0] && parts[1] && parts[0][1] === parts[1][1]) {
    return `${parts[0][1]}${parts[0][2]}/${parts[1][2]}`;
  }
  return labels.join("/");
}

/**
 * Largest font that keeps `text` inside the footprint, capped by the map-wide base size.
 * `heightShare` is tightened for the two faces of one fixture, whose labels sit a face-depth apart.
 */
export function fittedLabelFontSize(corners, text, base, heightShare = 0.68) {
  const { long, short } = footprintBox(corners);
  const chars = Math.max(1, String(text || "").length);
  const widthCap = (long * 0.88) / (chars * GLYPH_ADVANCE);
  return Math.max(0.14, Math.min(base, widthCap, short * heightShare));
}

/** Keep labels upright: a fixture turned 90° reads better with its text turned too. */
function labelRotation(rotationDeg) {
  const n = ((Number(rotationDeg) || 0) % 180 + 180) % 180;
  return n > 45 && n < 135 ? n - 180 : n;
}

function expandBox(box, x, y, w = 0, h = 0) {
  return {
    minX: Math.min(box.minX, x),
    minY: Math.min(box.minY, y),
    maxX: Math.max(box.maxX, x + w),
    maxY: Math.max(box.maxY, y + h),
  };
}

function entryBox(box, entryPoint) {
  if (!entryPoint) return box;
  const plaza = entryPoint.plaza;
  if (plaza) return expandBox(box, plaza.x, plaza.y, plaza.w, plaza.d);
  const x = Number(entryPoint.x);
  const y = Number(entryPoint.y);
  if (!Number.isFinite(x) || !Number.isFinite(y)) return box;
  return expandBox(box, x - 1.2, y - 1.2, 2.4, 2.4);
}

/**
 * @returns {{ floor, envelope, floorPlan, corridors, fixtures, vb, span }}
 */
export function buildStorePlanScene(layout, entryPoint = null, categories = []) {
  const floor = layoutFixtureZoneRect(layout);
  const envelope = layoutStoreEnvelope(layout);
  const content = layoutContentBounds(layout);

  let box = {
    minX: Math.min(floor.x, envelope.x),
    minY: Math.min(floor.y, envelope.y),
    maxX: Math.max(floor.x + floor.widthMeters, envelope.x + envelope.widthMeters),
    maxY: Math.max(floor.y + floor.depthMeters, envelope.y + envelope.depthMeters),
  };
  if (content) {
    box = expandBox(box, content.minX, content.minY, content.maxX - content.minX, content.maxY - content.minY);
  }
  box = entryBox(box, entryPoint);

  const span = Math.max(box.maxX - box.minX, box.maxY - box.minY, 4);
  const pad = Math.max(0.8, span * 0.035);
  const vb = {
    minX: box.minX - pad,
    minY: box.minY - pad,
    width: box.maxX - box.minX + pad * 2,
    height: box.maxY - box.minY + pad * 2,
  };

  const allShelves = layout?.shelves?.length ? layout.shelves : layout?.fixtures || [];
  const shelfById = new Map(allShelves.map((s) => [s.id, s]));

  const fixtures = shelfTilesForMap(layout, span).map((tile) => {
    const faceHeightShare = tile.faces.length > 1 ? 0.5 : 0.68;
    const faces = tile.faces.map((face) => {
      const color =
        colorForShelfFace(shelfById.get(face.shelfId), face.id, categories) || SHELF_FALLBACK_COLOR;
      return {
        ...face,
        color,
        fill: withAlpha(color, SHELF_FILL_ALPHA),
        labelFontSize: fittedLabelFontSize(face.corners, face.label, face.fontSize, faceHeightShare),
      };
    });
    const displayLabel = combinedFixtureLabel(faces);
    return {
      ...tile,
      faces,
      displayLabel,
      labelFontSize: fittedLabelFontSize(tile.corners, displayLabel, tile.fontSize),
      labelRotate: labelRotation(tile.rotate),
      labelVisible: shelfLabelVisibleOnMap(tile.corners, span),
    };
  });

  const plan = layout?.floorPlan;
  const floorPlan =
    plan?.url && plan.visible !== false
      ? {
          url: plan.url,
          x: Number(plan.x) || 0,
          y: Number(plan.y) || 0,
          widthMeters: Number(plan.widthMeters) || floor.widthMeters,
          depthMeters: Number(plan.depthMeters) || floor.depthMeters,
          rotationDeg: Number(plan.rotationDeg) || 0,
          opacity: plan.opacity == null ? 1 : Number(plan.opacity),
        }
      : null;

  return { floor, envelope, floorPlan, corridors: runwayBandsForMap(layout), fixtures, vb, span };
}

/** Slide an aisle badge along its corridor when it would otherwise sit under the entrance marker. */
export function badgeClearOfEntrance(band, entryPoint, minGapMeters = 2.2) {
  if (!band?.badge || !entryPoint) return band?.badge ?? null;
  const dx = band.badge.x - Number(entryPoint.x);
  const dy = band.badge.y - Number(entryPoint.y);
  if (!Number.isFinite(dx) || !Number.isFinite(dy)) return band.badge;
  if (Math.hypot(dx, dy) > minGapMeters) return band.badge;

  const horizontal = band.w >= band.h;
  const shift = (horizontal ? band.w : band.h) * 0.2;
  return horizontal
    ? { ...band.badge, x: band.badge.x + (dx < 0 ? -shift : shift) }
    : { ...band.badge, y: band.badge.y + (dy < 0 ? -shift : shift) };
}

/**
 * Where the walking line touches the target shelf: the middle of the face edge the shopper walks
 * up to. The aisle path stops on a corridor centreline, so without this the line and the pin float
 * in the aisle instead of landing on the shelf the shopper is looking for.
 *
 * @returns {{ x: number, y: number, outward: { x: number, y: number }, distance: number } | null}
 */
export function faceRouteAnchor(face, fromPoint) {
  const corners = face?.corners;
  if (!corners?.length || !fromPoint) return null;
  const center = centroid(corners);
  let best = null;

  for (let i = 0; i < corners.length; i += 1) {
    const a = corners[i];
    const b = corners[(i + 1) % corners.length];
    const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
    const outward = { x: mid.x - center.x, y: mid.y - center.y };
    const toward = { x: fromPoint.x - mid.x, y: fromPoint.y - mid.y };
    // Only edges turned toward the shopper: the others are the back and the ends of the fixture.
    if (outward.x * toward.x + outward.y * toward.y <= 0) continue;
    const distance = Math.hypot(toward.x, toward.y);
    if (!best || distance < best.distance) best = { mid, outward, distance };
  }

  if (!best) return { x: center.x, y: center.y, outward: { x: 0, y: -1 }, distance: 0 };
  const len = Math.hypot(best.outward.x, best.outward.y) || 1;
  return {
    x: best.mid.x,
    y: best.mid.y,
    outward: { x: best.outward.x / len, y: best.outward.y / len },
    distance: best.distance,
  };
}

/** Resolve the fixture + face a shelf id points at, so the target can be highlighted. */
export function findPlanFixture(fixtures, shelfId, mapUnitId) {
  const lookups = [mapUnitId, shelfId].filter(Boolean);
  if (!lookups.length) return null;

  for (const lookup of lookups) {
    for (const fixture of fixtures) {
      const face = fixture.faces.find((f) => f.shelfId === lookup);
      if (face) return { fixture, face };
      if (fixture.id === lookup || fixture.highlightIds?.has?.(lookup)) {
        return { fixture, face: fixture.faces[0] || null };
      }
    }
  }
  return null;
}
