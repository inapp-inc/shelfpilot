import assert from "node:assert/strict";
import test from "node:test";
import {
  shelfInsidePolygon,
  shelfRotatedCorners,
  layoutBoundaryPolygon,
} from "../src/services/polygonContainment.js";
import {
  buildEqualSegments,
  getShelfSegment,
  levelSegmentsList,
  normalizeFaceLevelSegments,
  normalizeShelfSegments,
  normalizeShelfFaceSegments,
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
    doubleSided: false,
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
    faceId: "A",
  });
  assert.equal(preview.maxFacings, 5);
  const full = previewFacings({
    shelf,
    product: { id: "p1", attributes: { widthMeters: 0.2 } },
    faceId: "A",
  });
  assert.equal(full.maxFacings, 17);
});

test("dual-face shelves keep independent segment layouts per face", () => {
  const shelf = normalizeShelf({
    id: "g1",
    type: "gondola",
    doubleSided: true,
    usableWidthMeters: 3.6,
    widthMeters: 3.6,
    faces: [{ id: "A" }, { id: "B" }],
  });
  const faceA = shelf.faces.find((f) => f.id === "A");
  const faceB = shelf.faces.find((f) => f.id === "B");
  faceA.segments = buildEqualSegments(3.6, 2);
  faceB.segments = buildEqualSegments(3.6, 3);
  normalizeShelfFaceSegments(shelf);

  assert.equal(faceA.segments.length, 2);
  assert.equal(faceB.segments.length, 3);
  assert.equal(shelf.segments, undefined);

  const segA = faceA.segments[0];
  const segB = faceB.segments[0];
  const previewA = previewFacings({
    shelf,
    product: { id: "p1", attributes: { widthMeters: 0.2 } },
    segmentId: segA.id,
    faceId: "A",
  });
  const previewB = previewFacings({
    shelf,
    product: { id: "p1", attributes: { widthMeters: 0.2 } },
    segmentId: segB.id,
    faceId: "B",
  });
  assert.equal(previewA.maxFacings, 8);
  assert.equal(previewB.maxFacings, 5);
});

test("per-level segments split independently on the same face", () => {
  const shelf = normalizeShelfFaceSegments({
    id: "sh-level-seg",
    usableWidthMeters: 3.6,
    widthMeters: 3.6,
    faces: [{ id: "A", categoryId: "cat-1", planogram: [] }],
  });
  const face = shelf.faces[0];
  face.levelSegments = {
    "0": buildEqualSegments(3.6, 2),
    "1": buildEqualSegments(3.6, 3),
  };
  normalizeFaceLevelSegments(face, 3.6);

  assert.equal(levelSegmentsList(shelf, "A", 0).length, 2);
  assert.equal(levelSegmentsList(shelf, "A", 1).length, 3);
  assert.equal(levelSegmentsList(shelf, "A", 2).length, 1);

  const segL0 = levelSegmentsList(shelf, "A", 0)[0];
  const segL1 = levelSegmentsList(shelf, "A", 1)[0];
  assert.ok(getShelfSegment(shelf, segL0.id, "A", 0));
  assert.ok(getShelfSegment(shelf, segL1.id, "A", 1));
  assert.equal(getShelfSegment(shelf, segL1.id, "A", 0), null);
});
