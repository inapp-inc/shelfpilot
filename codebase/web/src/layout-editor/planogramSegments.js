/** Client helpers for shelf bay segments in the planogram editor. */

const MIN_BAY_M = 0.2;
const SNAP_M = 0.05;

export function snapMeters(value, step = SNAP_M) {
  return Math.round(Number(value) / step) * step;
}

export function shelfLevels(shelf) {
  if (shelf?.levels?.length) return [...shelf.levels].sort((a, b) => (a.levelIndex ?? 0) - (b.levelIndex ?? 0));
  return [{ levelIndex: 0 }, { levelIndex: 1 }];
}

export function faceSegments(shelf, faceId = "A") {
  const id = faceId === "B" ? "B" : "A";
  const face = shelf?.faces?.find((f) => f.id === id);
  if (face?.segments?.length) return face.segments;
  if (!shelf?.faces?.length && shelf?.segments?.length) return shelf.segments;
  const usable = Math.max(0.1, Number(shelf?.usableWidthMeters ?? shelf?.widthMeters) || 1.2);
  return [{ id: "implicit", offsetMeters: 0, widthMeters: usable, fillMode: "full" }];
}

/** Segments for one planogram level — level override or inherited face default. */
export function effectiveSegmentsForLevel(shelf, faceId = "A", levelIndex = 0) {
  const id = faceId === "B" ? "B" : "A";
  const face = shelf?.faces?.find((f) => f.id === id);
  const key = String(Number(levelIndex) || 0);
  const levelSpecific = face?.levelSegments?.[key];
  if (Array.isArray(levelSpecific) && levelSpecific.length) return levelSpecific;
  return ensureFaceSegments(shelf, faceId);
}

export function defaultSegmentIdForLevel(shelf, faceId = "A", levelIndex = 0) {
  return effectiveSegmentsForLevel(shelf, faceId, levelIndex)?.[0]?.id || null;
}

export function ensureFaceSegments(shelf, faceId = "A") {
  return faceSegments(shelf, faceId);
}

/** @deprecated use ensureFaceSegments(shelf, faceId) */
export function ensureSegments(shelf) {
  return ensureFaceSegments(shelf, "A");
}

export function defaultSegmentId(shelf, faceId = "A") {
  return faceSegments(shelf, faceId)?.[0]?.id || null;
}

export function resolveSegmentId(placement, shelf, faceId = "A") {
  return placement?.segmentId || defaultSegmentId(shelf, faceId);
}

export function placementInCell(planogram, { levelIndex, segmentId, shelf, faceId = "A" }) {
  const seg = segmentId || defaultSegmentId(shelf, faceId);
  return (planogram || []).find(
    (p) =>
      Number(p.levelIndex) === Number(levelIndex) &&
      resolveSegmentId(p, shelf, faceId) === seg
  );
}

export function orphanPlacements(planogram, newSegments) {
  const ids = new Set((newSegments || []).map((s) => s.id));
  return (planogram || []).filter((p) => p.segmentId && !ids.has(p.segmentId));
}

export function orphanPlacementsForLevel(planogram, newSegments, levelIndex) {
  const ids = new Set((newSegments || []).map((s) => s.id));
  return (planogram || []).filter(
    (p) =>
      Number(p.levelIndex) === Number(levelIndex) &&
      p.segmentId &&
      !ids.has(p.segmentId)
  );
}

export function newSegmentId() {
  return `seg-${Math.random().toString(36).slice(2, 8)}`;
}

export function buildEqualSegmentsClient(usableWidthMeters, count) {
  const usable = Math.max(0.1, Number(usableWidthMeters) || 1.2);
  const n = Math.max(1, Math.min(12, Math.floor(Number(count) || 1)));
  const width = Number((usable / n).toFixed(3));
  const segments = [];
  for (let i = 0; i < n; i += 1) {
    segments.push({
      id: newSegmentId(),
      offsetMeters: Number((width * i).toFixed(3)),
      widthMeters: i === n - 1 ? Number((usable - width * (n - 1)).toFixed(3)) : width,
      fillMode: "full",
    });
  }
  return segments;
}

export function mergeAllSegments(usableWidthMeters) {
  const usable = Math.max(0.1, Number(usableWidthMeters) || 1.2);
  return [{ id: newSegmentId(), offsetMeters: 0, widthMeters: usable, fillMode: "full" }];
}

export function resizeDivider(segments, dividerIndex, boundaryMeters, usableWidthMeters) {
  const usable = Math.max(0.1, Number(usableWidthMeters) || 1.2);
  const sorted = [...segments].sort((a, b) => a.offsetMeters - b.offsetMeters);
  if (dividerIndex < 0 || dividerIndex >= sorted.length - 1) return sorted;

  const left = sorted[dividerIndex];
  const right = sorted[dividerIndex + 1];
  const rightEnd = right.offsetMeters + right.widthMeters;
  let boundary = snapMeters(boundaryMeters);

  const minBoundary = left.offsetMeters + MIN_BAY_M;
  const maxBoundary = rightEnd - MIN_BAY_M;
  boundary = Math.max(minBoundary, Math.min(maxBoundary, boundary));

  const next = sorted.map((s, i) => {
    if (i === dividerIndex) {
      return { ...s, widthMeters: Number((boundary - s.offsetMeters).toFixed(3)) };
    }
    if (i === dividerIndex + 1) {
      return {
        ...s,
        offsetMeters: Number(boundary.toFixed(3)),
        widthMeters: Number((rightEnd - boundary).toFixed(3)),
      };
    }
    return { ...s };
  });

  const total = next[next.length - 1].offsetMeters + next[next.length - 1].widthMeters;
  if (Math.abs(total - usable) > 0.02) return sorted;
  return next;
}

export function isShelfLike(_type) {
  return true;
}

