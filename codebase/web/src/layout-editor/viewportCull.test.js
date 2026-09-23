import { describe, expect, it } from "vitest";
import {
  VIEWPORT_CULL_MIN_ENTITIES,
  aabbIntersectsViewport,
  shouldCullCanvasEntities,
  worldViewportFromStage,
} from "./viewportCull.js";

describe("shouldCullCanvasEntities", () => {
  it("does not cull below the threshold", () => {
    expect(shouldCullCanvasEntities(VIEWPORT_CULL_MIN_ENTITIES - 1)).toBe(false);
  });
  it("culls at and above the threshold", () => {
    expect(shouldCullCanvasEntities(VIEWPORT_CULL_MIN_ENTITIES)).toBe(true);
    expect(shouldCullCanvasEntities(VIEWPORT_CULL_MIN_ENTITIES + 500)).toBe(true);
  });
});

describe("worldViewportFromStage", () => {
  const bounds = { minX: 0, minY: 0 };

  it("returns null without bounds or scale", () => {
    expect(worldViewportFromStage({ scale: 1 })).toBeNull();
    expect(worldViewportFromStage({ bounds, scale: 0 })).toBeNull();
  });

  it("converts stage scroll/size into a world-space rect, padded by margin", () => {
    const vp = worldViewportFromStage({
      scrollLeft: 100,
      scrollTop: 50,
      clientWidth: 800,
      clientHeight: 600,
      scale: 10,
      bounds,
      paddingPx: 0,
      marginM: 2,
    });
    expect(vp).toEqual({
      minX: 100 / 10 - 2,
      minY: 50 / 10 - 2,
      maxX: (100 + 800) / 10 + 2,
      maxY: (50 + 600) / 10 + 2,
    });
  });
});

describe("aabbIntersectsViewport", () => {
  const viewport = { minX: 0, minY: 0, maxX: 10, maxY: 10 };

  it("treats a missing aabb or viewport as always visible (fail open, never hides real entities)", () => {
    expect(aabbIntersectsViewport(null, viewport)).toBe(true);
    expect(aabbIntersectsViewport({ x: 0, y: 0, w: 1, h: 1 }, null)).toBe(true);
  });

  it("detects overlap using x/y/w/h shorthand", () => {
    expect(aabbIntersectsViewport({ x: 5, y: 5, w: 2, h: 2 }, viewport)).toBe(true);
  });

  it("detects a box fully outside the viewport", () => {
    expect(aabbIntersectsViewport({ x: 20, y: 20, w: 2, h: 2 }, viewport)).toBe(false);
  });

  it("treats touching edges as intersecting (inclusive bounds)", () => {
    expect(aabbIntersectsViewport({ x: 10, y: 0, w: 1, h: 1 }, viewport)).toBe(true);
  });

  it("supports explicit minX/minY/maxX/maxY shape as well as x/y/w/h", () => {
    expect(aabbIntersectsViewport({ minX: -5, minY: -5, maxX: -1, maxY: -1 }, viewport)).toBe(false);
    expect(aabbIntersectsViewport({ minX: -1, minY: -1, maxX: 1, maxY: 1 }, viewport)).toBe(true);
  });
});
