/**
 * Shelf bay segments — divide usable width for segment-scoped planogram capacity.
 * Segments are stored per face on dual-sided shelves (faces[].segments).
 */
import { randomUUID } from "node:crypto";

export class SegmentError extends Error {
  constructor(code) {
    super(code);
    this.code = code;
  }
}

export function normalizeRotationDeg(deg) {
  const n = Number(deg) || 0;
  return ((n % 360) + 360) % 360;
}

function normalizeSegmentsArray(segments, usable) {
  let list = Array.isArray(segments) ? segments : [];
  if (!list.length) {
    return [
      {
        id: `seg-${randomUUID().slice(0, 6)}`,
        offsetMeters: 0,
        widthMeters: usable,
        fillMode: "full",
      },
    ];
  }

  list = list.map((s) => ({
    id: s.id || `seg-${randomUUID().slice(0, 6)}`,
    offsetMeters: Math.max(0, Number(s.offsetMeters) || 0),
    widthMeters: Math.max(0.1, Number(s.widthMeters) || 0.1),
    fillMode: s.fillMode === "partial" ? "partial" : "full",
  }));
  list.sort((a, b) => a.offsetMeters - b.offsetMeters);

  for (let i = 0; i < list.length; i += 1) {
    const seg = list[i];
    if (seg.offsetMeters + seg.widthMeters > usable + 1e-6) {
      throw new SegmentError("segment_out_of_range");
    }
    if (i > 0) {
      const prev = list[i - 1];
      if (prev.offsetMeters + prev.widthMeters > seg.offsetMeters + 1e-6) {
        throw new SegmentError("segment_overlap");
      }
    }
  }

  return list;
}

export function normalizeFaceSegments(face, usableWidthMeters) {
  if (!face) return face;
  const usable = Math.max(0.1, Number(usableWidthMeters) || 1.2);
  face.segments = normalizeSegmentsArray(face.segments, usable);
  return face;
}

/** Legacy single-shelf segments (single-sided fixtures). */
export function normalizeShelfSegments(shelf) {
  if (!shelf) return shelf;
  const usable = Math.max(0.1, Number(shelf.usableWidthMeters ?? shelf.widthMeters) || 1.2);
  shelf.usableWidthMeters = usable;
  if (!Number(shelf.widthMeters)) shelf.widthMeters = usable;
  shelf.segments = normalizeSegmentsArray(shelf.segments, usable);
  return shelf;
}

export function normalizeShelfFaceSegments(shelf) {
  if (!shelf) return shelf;
  const usable = Math.max(0.1, Number(shelf.usableWidthMeters ?? shelf.widthMeters) || 1.2);
  shelf.usableWidthMeters = usable;
  if (!Number(shelf.widthMeters)) shelf.widthMeters = usable;

  if (!Array.isArray(shelf.faces) || !shelf.faces.length) {
    return normalizeShelfSegments(shelf);
  }

  const legacySegments = Array.isArray(shelf.segments) && shelf.segments.length ? shelf.segments : null;
  const dualFace = shelf.doubleSided !== false && shelf.faces.length >= 2;

  for (const face of shelf.faces) {
    const hasFaceSegments = Array.isArray(face.segments) && face.segments.length > 0;
    if (!hasFaceSegments && face.id === "A" && legacySegments) {
      face.segments = legacySegments.map((s) => ({ ...s }));
    }
    normalizeFaceSegments(face, usable);
    normalizeFaceLevelSegments(face, usable);
  }

  if (dualFace) {
    delete shelf.segments;
  } else {
    shelf.segments = shelf.faces[0]?.segments;
  }

  return shelf;
}

export function faceSegmentsList(shelf, faceId = "A") {
  const id = faceId === "B" ? "B" : "A";
  const face = shelf?.faces?.find((f) => f.id === id);
  if (face?.segments?.length) return face.segments;
  if (!shelf?.faces?.length && shelf?.segments?.length) return shelf.segments;
  return [];
}

/** Segments effective for one planogram level (level override or face default). */
export function levelSegmentsList(shelf, faceId = "A", levelIndex = 0) {
  const id = faceId === "B" ? "B" : "A";
  const face = shelf?.faces?.find((f) => f.id === id);
  const key = String(Number(levelIndex) || 0);
  const levelSpecific = face?.levelSegments?.[key];
  if (Array.isArray(levelSpecific) && levelSpecific.length) return levelSpecific;
  const faceDefault = faceSegmentsList(shelf, faceId);
  if (faceDefault.length) return faceDefault;
  return [];
}

export function normalizeFaceLevelSegments(face, usableWidthMeters) {
  if (!face?.levelSegments || typeof face.levelSegments !== "object") return face;
  const usable = Math.max(0.1, Number(usableWidthMeters) || 1.2);
  for (const key of Object.keys(face.levelSegments)) {
    face.levelSegments[key] = normalizeSegmentsArray(face.levelSegments[key], usable);
  }
  return face;
}

export function getShelfSegment(shelf, segmentId, faceId = null, levelIndex = null) {
  if (!segmentId) {
    const list =
      faceId != null && levelIndex != null
        ? levelSegmentsList(shelf, faceId, levelIndex)
        : faceId
          ? faceSegmentsList(shelf, faceId)
          : faceSegmentsList(shelf, "A");
    return list[0] || (shelf?.segments || [])[0] || null;
  }

  if (faceId != null && levelIndex != null) {
    const levelSeg = levelSegmentsList(shelf, faceId, levelIndex).find((s) => s.id === segmentId);
    if (levelSeg) return levelSeg;
    return null;
  }

  if (faceId) {
    const seg = faceSegmentsList(shelf, faceId).find((s) => s.id === segmentId);
    if (seg) return seg;
  }

  for (const face of shelf?.faces || []) {
    const seg = (face.segments || []).find((s) => s.id === segmentId);
    if (seg) return seg;
    if (face.levelSegments && typeof face.levelSegments === "object") {
      for (const list of Object.values(face.levelSegments)) {
        const levelSeg = (list || []).find((s) => s.id === segmentId);
        if (levelSeg) return levelSeg;
      }
    }
  }

  return (shelf?.segments || []).find((s) => s.id === segmentId) || null;
}

export function segmentWidthForPlanogram(shelf, segmentId, faceId = "A", levelIndex = null) {
  const usable = Number(shelf?.usableWidthMeters ?? shelf?.widthMeters) || 0;
  if (!segmentId) return usable;
  const seg = getShelfSegment(shelf, segmentId, faceId, levelIndex);
  if (!seg) return null;
  return seg.widthMeters;
}

export function buildEqualSegments(usableWidthMeters, count) {
  const usable = Math.max(0.1, Number(usableWidthMeters) || 1.2);
  const n = Math.max(1, Math.min(12, Math.floor(Number(count) || 1)));
  const width = Number((usable / n).toFixed(3));
  const segments = [];
  for (let i = 0; i < n; i += 1) {
    segments.push({
      id: `seg-${randomUUID().slice(0, 6)}`,
      offsetMeters: Number((width * i).toFixed(3)),
      widthMeters: i === n - 1 ? Number((usable - width * (n - 1)).toFixed(3)) : width,
      fillMode: "full",
    });
  }
  return segments;
}
