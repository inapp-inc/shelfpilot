# Review guide — visible-aisles-planogram-products

**Start here** before implementation.

## One-page summary

| Area | Today | After |
|------|-------|-------|
| **Aisles (horizontal)** | Generated but faint 20% gray strip, tiny label | Distinct walkway: solid fill + dashed border + centered label |
| **Aisles (vertical)** | Footprint dims swapped → dropped / wrong direction | `orientation`-aware footprint + rendering; show correctly |
| **Spacing** | Aisle exists but reads as "no gap" | Enforced min-aisle space; visible gaps between shelf blocks |
| **Generate toast** | Shelf count (+ skipped) | Shelf **and** aisle count |
| **Planogram products** | Can be stale after import | Reloads on editor open + after import; live picker |
| **Empty picker** | Ambiguous "no products" | Distinguishes "no face category" vs "no products in category" + refresh |
| **Special zones** | None | Draw/edit `hot` / `offer` / `special` (custom name) zones inside polygon |
| **Entry points** | None | Place store entrance markers on the layout |
| **Aisles on drawn polygons** | Fixed left-anchor → dropped on irregular shapes | **Scan-based inside-run** aisles; work on any polygon |
| **Orientation** | Single (H or V) | **Mixed** rows + columns (default) |
| **Planogram products** | Autogen used static category ids → empty | Mix from **real catalog** → products list |
| **Drawn area** | Rectangle border mixed with polygon | Polygon outline only |
| **Zoom** | ≤ 180% | Up to **500%** + Reset |

> Iteration 2 (2026-07-20): see [ANALYSIS.md](./ANALYSIS.md) for root-cause detail.

## Root cause (verified in code)

1. `codebase/web/src/layout-editor/Canvas2D.jsx` — aisles render with
   `background: rgba(156,163,175,0.2)` and a 10px label ⇒ visually invisible.
2. `codebase/api/src/services/polygonContainment.js` `aisleFootprint()` always maps
   `lengthMeters → w (X)` and `widthMeters → d (Y)`. Correct for horizontal aisles,
   **wrong for vertical** ones (packer's `else` branch), so they fail containment or
   render sideways.
3. `codebase/web/src/App.jsx` / `LayoutEditor.jsx` — editor planogram uses the
   catalog loaded for the vertical; not force-refreshed after an Excel import, so the
   picker can be stale.

## Documents

1. [proposal.md](./proposal.md)
2. [design.md](./design.md)
3. [AUDIT.md](./AUDIT.md)
4. [tasks.md](./tasks.md)
5. Spec deltas: `specs/layouts/`, `specs/planogram/`, `specs/ui-fidelity/`
6. [FSD_DELTA.md](./FSD_DELTA.md)

## Decisions needed

| # | Question | Default if no answer |
|---|----------|----------------------|
| 1 | Aisle fill style: solid tint vs diagonal-hatch walkway? | Solid light tint + dashed border + label |
| 2 | Show aisle length/width label on canvas? | Yes: `Aisle N` + width in meters on hover/title |
| 3 | Minimum visible aisle width if config value is very small? | Clamp to ≥ 0.9 m for autogen spacing |
| 4 | Refresh catalog automatically after import, or manual button only? | Auto-refresh + manual refresh button |
| 5 | Planogram picker: show products with **no** category too? | No — keep face-category scoping, but clearer empty-state |
| 6 | Zone types to ship | `hot`, `offer`, `special` (custom name on `special`) |
| 7 | Zone shape | Rectangle only for now (polygon zones later) |
| 8 | Should zones affect autogen packing? | No — overlays only this change; future traffic-flow hint |
| 9 | Entry points: one or many? | Many supported; at least one typical |
| 10 | Do entry points influence autogen now? | No — metadata only this change |

## Approve?

Reply **"approve visible-aisles-planogram-products"** with any edits to decisions 1–5.
