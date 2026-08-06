/**
 * Category colour resolution shared by the 2D canvas, 3D scene, and legends.
 *
 * Categories carry a `color` in the catalog, but every category created without
 * one falls back to the same brand crimson, which gives no visual separation on
 * the floor plan. When a category has no distinct colour of its own we derive a
 * stable one from its id, so colour coding works for an unstyled catalog and
 * never shifts between renders or sessions.
 */

export const BRAND_COLOR = "#A30A2A";

/** Distinguishable hues that stay legible as translucent fills on the light floor. */
export const CATEGORY_PALETTE = [
  "#A30A2A",
  "#0EA5E9",
  "#16A34A",
  "#F59E0B",
  "#7C3AED",
  "#DB2777",
  "#0F766E",
  "#2563EB",
  "#EA580C",
  "#65A30D",
  "#9333EA",
  "#0891B2",
  "#B45309",
  "#BE123C",
  "#4338CA",
  "#047857",
];

/** Colours treated as "no colour chosen" so we derive a distinct one instead. */
const GENERIC_COLORS = new Set([BRAND_COLOR.toLowerCase(), "#a30a2a", "#c4183a"]);

function hashString(value) {
  let hash = 0;
  const str = String(value || "");
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function paletteColorForId(categoryId) {
  if (!categoryId) return BRAND_COLOR;
  return CATEGORY_PALETTE[hashString(categoryId) % CATEGORY_PALETTE.length];
}

function isUsableColor(color) {
  if (!color || typeof color !== "string") return false;
  const trimmed = color.trim().toLowerCase();
  if (!trimmed) return false;
  // Three.js and CSS gradients both choke on oklch(), which the seed catalog uses.
  if (!trimmed.startsWith("#")) return false;
  return !GENERIC_COLORS.has(trimmed);
}

/** Colour for a catalog category: its own colour, else a stable derived one. */
export function colorForCategoryId(categories, categoryId) {
  if (!categoryId) return BRAND_COLOR;
  const cat = (categories || []).find((c) => c.id === categoryId);
  if (isUsableColor(cat?.color)) return cat.color;
  return paletteColorForId(categoryId);
}

/**
 * Colour for one face of a shelf.
 * A colour stored on the face at mapping time wins, so a planner's explicit
 * override survives; otherwise we resolve live from the catalog.
 */
export function colorForShelfFace(shelf, faceId, categories) {
  const face =
    shelf?.faces?.find((f) => f.id === faceId) || (faceId === "A" ? shelf?.faces?.[0] : null);
  const categoryId = face?.categoryId ?? shelf?.categoryId ?? null;
  if (isUsableColor(face?.color)) return face.color;
  if (isUsableColor(shelf?.color) && (!face || face.id === "A")) return shelf.color;
  if (!categoryId) return null;
  return colorForCategoryId(categories, categoryId);
}

/** Hex colour with an alpha suffix, e.g. withAlpha("#0EA5E9", 0.2). */
export function withAlpha(hex, alpha) {
  if (!hex || typeof hex !== "string" || !hex.startsWith("#")) return hex;
  const a = Math.round(Math.min(1, Math.max(0, Number(alpha) || 0)) * 255)
    .toString(16)
    .padStart(2, "0");
  // Expand #abc to #aabbcc so the alpha suffix lands correctly.
  const base = hex.length === 4 ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex.slice(0, 7);
  return `${base}${a}`;
}

/** Inline style for a colour-coded category chip (emoji badge, legend pill). */
export function categoryChipStyle(color) {
  const base = color || BRAND_COLOR;
  return {
    background: withAlpha(base, 0.16),
    borderColor: base,
    color: base,
  };
}
