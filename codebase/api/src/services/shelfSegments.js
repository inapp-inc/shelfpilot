/**
 * Shelf bay segments — divide usable width for segment-scoped planogram capacity.
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

export function normalizeShelfSegments(shelf) {
  if (!shelf) return shelf;
  const usable = Math.max(0.1, Number(shelf.usableWidthMeters ?? shelf.widthMeters) || 1.2);
  shelf.usableWidthMeters = usable;
  if (!Number(shelf.widthMeters)) shelf.widthMeters = usable;

  let segments = Array.isArray(shelf.segments) ? shelf.segments : [];
  if (!segments.length) {
    shelf.segments = [
      {
        id: `seg-${randomUUID().slice(0, 6)}`,
        offsetMeters: 0,
        widthMeters: usable,
        fillMode: "full",
      },
    ];
    return shelf;
  }

  segments = segments.map((s) => ({
    id: s.id || `seg-${randomUUID().slice(0, 6)}`,
    offsetMeters: Math.max(0, Number(s.offsetMeters) || 0),
    widthMeters: Math.max(0.1, Number(s.widthMeters) || 0.1),
    fillMode: s.fillMode === "partial" ? "partial" : "full",
  }));
  segments.sort((a, b) => a.offsetMeters - b.offsetMeters);

  for (let i = 0; i < segments.length; i += 1) {
    const seg = segments[i];
    if (seg.offsetMeters + seg.widthMeters > usable + 1e-6) {
      throw new SegmentError("segment_out_of_range");
    }
    if (i > 0) {
      const prev = segments[i - 1];
      if (prev.offsetMeters + prev.widthMeters > seg.offsetMeters + 1e-6) {
        throw new SegmentError("segment_overlap");
      }
    }
  }

  shelf.segments = segments;
  return shelf;
}

export function getShelfSegment(shelf, segmentId) {
  if (!segmentId) return (shelf.segments || [])[0] || null;
  return (shelf.segments || []).find((s) => s.id === segmentId) || null;
}

export function segmentWidthForPlanogram(shelf, segmentId) {
  const usable = Number(shelf?.usableWidthMeters ?? shelf?.widthMeters) || 0;
  if (!segmentId) return usable;
  const seg = getShelfSegment(shelf, segmentId);
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
