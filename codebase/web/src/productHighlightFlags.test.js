import { describe, expect, it } from "vitest";
import { productHighlightFlags } from "./Scene3D.jsx";

/**
 * Regression guard for a reported bug: "the products not showing in 3D shelves also showing red
 * color on nearby shelves as well — only need to show red color on selected shelves only."
 *
 * The 3D focus group (FR-VIEW-02) draws the clicked shelf plus up to two neighbours for context.
 * resolveActiveFaceForHighlight() falls back to the same activeFace letter for every unit in that
 * group, so any flag gated on `isHighlighted` (true for the whole group) instead of `isTarget`
 * (true only for the shelf actually clicked) paints the highlight color across all of them.
 */
describe("productHighlightFlags", () => {
  const base = { activeFace: "A", shelfFocusMode: true };

  it("glows only the clicked shelf's active face", () => {
    const target = productHighlightFlags({ ...base, isTarget: true, isHighlighted: true, faceId: "A" });
    expect(target.emphasized).toBe(true);
    expect(target.shelfFocus).toBe(true);
    expect(target.dimmed).toBe(false);
  });

  it("does not glow a context neighbour even though it shares isHighlighted and activeFace", () => {
    const neighbour = productHighlightFlags({
      ...base,
      isTarget: false,
      isHighlighted: true,
      faceId: "A",
    });
    expect(neighbour.emphasized).toBe(false);
    expect(neighbour.shelfFocus).toBe(false);
  });

  it("keeps a context neighbour at full brightness (not dimmed) so it stays visible", () => {
    const neighbour = productHighlightFlags({
      ...base,
      isTarget: false,
      isHighlighted: true,
      faceId: "A",
    });
    expect(neighbour.dimmed).toBe(false);
  });

  it("dims the target's own off-camera face (the merged unit's other side)", () => {
    const offFace = productHighlightFlags({
      ...base,
      isTarget: true,
      isHighlighted: true,
      faceId: "B", // activeFace is "A"
    });
    expect(offFace.emphasized).toBe(false);
    expect(offFace.dimmed).toBe(true);
  });

  it("dims shelves entirely outside the focus group", () => {
    const outside = productHighlightFlags({
      ...base,
      isTarget: false,
      isHighlighted: false,
      faceId: "A",
    });
    expect(outside.dimmed).toBe(true);
    expect(outside.emphasized).toBe(false);
  });

  it("leaves everything undimmed and unglowed outside shelf-focus mode", () => {
    const flags = productHighlightFlags({
      isTarget: false,
      isHighlighted: false,
      faceId: "A",
      activeFace: "A",
      shelfFocusMode: false,
    });
    expect(flags.dimmed).toBe(false);
    expect(flags.emphasized).toBe(false);
  });

  it("still emphasizes a shopper-mode highlighted product by id regardless of target/highlight state", () => {
    const flags = productHighlightFlags({
      isTarget: false,
      isHighlighted: false,
      faceId: "A",
      activeFace: "A",
      shelfFocusMode: false,
      highlightProductId: "prod-1",
      productId: "prod-1",
    });
    expect(flags.emphasized).toBe(true);
  });
});
