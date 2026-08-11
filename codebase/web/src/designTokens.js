/**
 * ShelfPilot design tokens — brand, aisle faces, corridors, neutrals.
 * Keep CSS :root in styles.css aligned with these values.
 */

export const BRAND = {
  hex: "#9F1239",
  hot: "#BE123C",
  deep: "#881337",
};

/** Near / front merchandising face (gondola A, aisle-facing side). Warm amber-orange. */
export const FACE_A = {
  hex: "#C2410C",
  deep: "#9A3412",
  soft: "rgba(194, 65, 12, 0.16)",
  ring: "rgba(194, 65, 12, 0.55)",
};

/** Opposite-aisle merchandising face (gondola B). Cool teal — visually distinct from face A. */
export const FACE_B = {
  hex: "#0D9488",
  deep: "#0F766E",
  soft: "rgba(13, 148, 136, 0.16)",
  ring: "rgba(13, 148, 136, 0.55)",
};

/** Walk-aisle corridor highlight when a shelf is selected. Indigo — separate from face hues. */
export const AISLE_ACTIVE = {
  hex: "#6366F1",
  deep: "#4F46E5",
  soft: "rgba(99, 102, 241, 0.26)",
  ring: "rgba(99, 102, 241, 0.48)",
};

export const NEUTRAL = {
  ink: "#1E293B",
  muted: "#64748B",
  line: "#E2E8F0",
  canvas: "#E8E4DE",
  floor: "#FAF9F7",
  bg: "#EBE8E3",
};

export function hexToThree(hex) {
  return parseInt(String(hex).replace("#", ""), 16);
}

/** @deprecated use BRAND.hex */
export const BRAND_COLOR = BRAND.hex;
