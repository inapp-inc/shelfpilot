# Analysis & Iteration 2 — autogen rework + planogram mapping

**Date:** 2026-07-20 · Follow-up after first implementation review.

This iteration addresses feedback that (a) aisles still weren't generated onto drawn
layouts, (b) products weren't listing under categories in the planogram, and adds
mixed-orientation packing, larger zoom, and cleaner drawn-area rendering.

## Root-cause analysis

### 1. Aisles not generated on drawn (polygon) layouts — CONFIRMED BUG

`layoutPacker.js` created each aisle anchored at a fixed left edge (`x = minX + margin`)
and used `maxLengthInsideX(...)`, which shrinks the length **from that fixed anchor**.
For an irregular / slanted drawn polygon, that anchor point is frequently **outside**
the polygon at the aisle's y-band, so `rectFullyInsidePolygon` fails for every candidate
length and `maxLengthInsideX` returns `0` → **no aisle is pushed**. Shelves still
appeared because they are placed cell-by-cell with their own containment test.

**Fix:** replace fixed-anchor aisle placement with **scan-based inside-run detection**.
At each aisle band the packer scans across the polygon and emits an aisle for every
contiguous interior run (`insideRunsAlongX` / `insideRunsAlongY`). Works for rectangles
and arbitrary polygons alike.

### 2. Products not listing under categories — CONFIRMED BUG

Smart autogenerate assigned categories from the **static** `DEFAULT_CATEGORY_MIX`
template ids (`hm-grocery`, `grocery`, …). Imported catalogs use their **own** category
ids, so shelves were tagged with categories that have **no matching products**, and
`filterProductsForShelf` returned an empty list.

**Fix:** build the category mix from the **actual loaded catalog** top-level categories
(`mixFromCategories`) so autogenerate assigns real ids that own products. The planogram
picker then lists products for the shelf/face category (and descendants).

### 3. Single orientation only — ENHANCEMENT

The packer only supported one orientation per run. Added **`mixed`** mode: the floor is
split along its longer axis into two zones — one packed with vertical shelf columns, the
other with horizontal shelf rows — separated by a corridor aisle. Result: both
horizontal and vertical shelves in one layout. `mixed` is now the editor default.

### 4. Drawn area "mixed with straight lines" — UI BUG

`.floor-plan` always painted a rectangular crimson border that overlapped the polygon
outline, so the drawn shape looked like it had stray straight edges.

**Fix:** drop the rectangular border in polygon (strict) mode; the SVG polygon outline
is the single source of the boundary. The viewport already sizes/clips to the polygon
AABB so the shape aligns.

### 5. Zoom too small — ENHANCEMENT

Zoom capped at 1.8× on a 480px base. Raised base pixels-per-meter and max zoom to **5×
(500%)** with a Reset control; wheel and buttons updated.

## Changes in this iteration

| Area | File | Change |
|------|------|--------|
| Packer | `api/src/services/layoutPacker.js` | Scan-based aisles; `packRegion`; `mixed`/`auto`/`horizontal`/`vertical`; walkable min clamp; returns `aisleCount` |
| Mix | `web/src/storeTypes.js` | `mixFromCategories()` from real catalog |
| Editor | `web/src/layout-editor/LayoutEditor.jsx` | Mix from catalog; default orientation `mixed`; zoom 0.5–5×; Reset |
| Generate UI | `web/src/layout-editor/SmartGeneratePanel.jsx` | "Mixed (rows + columns)" option (default) |
| Canvas | `web/src/layout-editor/Canvas2D.jsx` | No rectangle border in polygon mode |
| Tests | `api/test/zones-aisles.test.js` | Mixed orientation + scan-based aisle coverage |

## Verification checklist (run locally — shell was unavailable in-session)

- `cd codebase/api && npm test` — expect packer/aisle/zone/entry tests green.
- `cd codebase/web && npm run build` — expect clean build.
- Draw an irregular area → Generate (Mixed) → **aisles appear** between both row and
  column shelf blocks; toast reports shelves + aisles.
- Import products → open a layout of that store type → Generate → click a shelf → its
  category is set and **its products list** in the planogram (use Refresh if needed).
- Zoom in past 100% up to 500%.
