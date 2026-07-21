import assert from "node:assert/strict";
import test from "node:test";
import {
  shelfInsidePolygon,
  shelfRotatedCorners,
  layoutBoundaryPolygon,
} from "../src/services/polygonContainment.js";
import {
  buildEqualSegments,
  normalizeShelfSegments,
  SegmentError,
} from "../src/services/shelfSegments.js";
import { previewFacings } from "../src/services/planogramMath.js";
import { normalizeShelf } from "../src/services/shelfFaces.js";

const SQUARE = {
  widthMeters: 10,
  depthMeters: 10,
  shape: "polygon",
  polygon: [
    { x: 0, y: 0 },
    { x: 10, y: 0 },
    { x: 10, y: 10 },
    { x: 0, y: 10 },
  ],
};

test("45° shelf corners stay inside square polygon when placed with margin", () => {
  const shelf = {
    x: 2,
    y: 2,
    usableWidthMeters: 2,
    depthMeters: 1,
    rotationDeg: 45,
  };
  const poly = layoutBoundaryPolygon(SQUARE);
  assert.ok(shelfInsidePolygon(shelf, poly));
  const corners = shelfRotatedCorners(shelf);
  assert.equal(corners.length, 4);
});

test("45° shelf near corner is outside square polygon", () => {
  const shelf = {
    x: 8.5,
    y: 8.5,
    usableWidthMeters: 2,
    depthMeters: 1,
    rotationDeg: 45,
  };
  const poly = layoutBoundaryPolygon(SQUARE);
  assert.ok(!shelfInsidePolygon(shelf, poly));
});

test("normalizeShelfSegments rejects overlap", () => {
  assert.throws(
    () =>
      normalizeShelfSegments({
        usableWidthMeters: 3,
        segments: [
          { offsetMeters: 0, widthMeters: 2, fillMode: "full" },
          { offsetMeters: 1, widthMeters: 2, fillMode: "full" },
        ],
      }),
    (err) => err instanceof SegmentError && err.code === "segment_overlap"
  );
});

test("buildEqualSegments spans full usable width", () => {
  const segs = buildEqualSegments(3.6, 3);
  assert.equal(segs.length, 3);
  const total = segs[segs.length - 1].offsetMeters + segs[segs.length - 1].widthMeters;
  assert.ok(Math.abs(total - 3.6) < 0.01);
});

test("previewFacings uses segment width when segmentId set", () => {
  const shelf = normalizeShelf({
    type: "shelf",
    usableWidthMeters: 3.6,
    widthMeters: 3.6,
    depthMeters: 0.6,
    segments: buildEqualSegments(3.6, 3),
  });
  const seg = shelf.segments[1];
  const preview = previewFacings({
    shelf,
    product: { id: "p1", attributes: { widthMeters: 0.2 } },
    segmentId: seg.id,
  });
  assert.equal(preview.maxFacings, 6);
  const full = previewFacings({
    shelf,
    product: { id: "p1", attributes: { widthMeters: 0.2 } },
  });
  assert.equal(full.maxFacings, 18);
});
