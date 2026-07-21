# Tasks — visible-aisles-planogram-products

## SEED-VA-09 — Iteration 2: autogen rework + planogram mapping (2026-07-20)
- [x] Scan-based inside-run aisle detection (fixes aisles on irregular drawn polygons) — `layoutPacker.js`.
- [x] `mixed` orientation packer (both horizontal rows + vertical columns) + default in editor.
- [x] Category mix built from real catalog (`mixFromCategories`) so products list under shelf categories.
- [x] Remove rectangular canvas border in polygon mode — `Canvas2D.jsx`.
- [x] Zoom range 0.5–5× (500%) + Reset — `LayoutEditor.jsx`.
- [x] Tests: mixed orientation + scan-based aisles — `test/zones-aisles.test.js`.
- [ ] Run `npm test` (api) + `npm run build` (web) locally to confirm (shell unavailable in session).


## SEED-VA-01 — Aisle orientation + footprint (API)
- [x] Add `orientation` (`horizontal`|`vertical`, default `horizontal`) to aisle normalize in `layoutNormalize.js`.
- [x] Make `aisleFootprint` in `polygonContainment.js` orientation-aware.
- [x] Unit test: vertical aisle footprint stays inside polygon; horizontal unchanged. (`test/zones-aisles.test.js`)

## SEED-VA-02 — Autogen aisle tagging + spacing (API)
- [x] Tag each generated aisle with `orientation` in `layoutPacker.js` (both branches).
- [x] Clamp autogen `minAisle` to a walkable minimum (≥ 0.9 m).
- [x] Return `aisleCount` from `packAislesAndShelves`; `generated.aisles` surfaced by route.
- [x] Unit test: tall polygon → vertical aisles generated and retained.

## SEED-VA-03 — Canvas walkway rendering (web)
- [x] Render aisles in `Canvas2D.jsx` as visible, orientation-aware walkways (hatched fill + dashed border + label + title).
- [x] Add `.aisle` walkway styles in `styles.css`.
- [x] Horizontal + vertical aisles draw correctly; shelf badges stay on top.

## SEED-VA-04 — Planogram product freshness (web)
- [x] Reload catalog for `layout.vertical` on layout-editor open in `App.jsx` (existing effect) + manual refresh.
- [x] Reload catalog after successful import so editor picker updates.
- [x] `MerchandisingPanel.jsx`: product count, explicit empty-states (no face category vs no products), Refresh button.
- [x] Show aisle count in generate toast (`LayoutEditor.jsx`).

## SEED-VA-05 — Special zones model + API
- [x] Add `zones[]` normalize (type, name, color-by-type default, numeric coercion) — `services/zones.js` + `layoutNormalize.js`.
- [x] Zones CRUD in `layouts.js` (`POST`/`PATCH`/`DELETE`), strict containment via `rectFullyInsidePolygon`.
- [x] Autogenerate preserves `zones[]` (separate collection, untouched).
- [x] Unit test: zone containment reject; normalize keeps zones.

## SEED-VA-06 — Entry points model + API
- [x] Add `entryPoints[]` normalize — `services/zones.js` + `layoutNormalize.js`.
- [x] Entry points CRUD in `layouts.js`.
- [x] Unit test: entry point containment (point-in-polygon).

## SEED-VA-07 — Zones + entry-point UI (web)
- [x] Palette tools: `zone:hot|offer|special` + `entry` in `Palette.jsx` / `referenceCatalog.js`.
- [x] Draw/render zones (tinted rect + dashed border + label) and entry markers in `Canvas2D.jsx`, respecting `insideZone`.
- [x] Side-rail Zones + Entry points panel (rename/recolor/retype/resize/delete) — `ZonesEntryPanel.jsx` + `EditorSideRail.jsx`.
- [x] `.zone` + `.entry-point` styles in `styles.css`.

## SEED-VA-08 — Docs, specs, tests
- [x] Update OpenAPI: `orientation` on aisle, `zones`, `entryPoints` schemas + endpoints, `generated.aisles` (`Docs/openapi.yaml`).
- [x] Spec deltas authored (layouts/ui-fidelity/planogram) in this change folder.
- [x] FSD delta authored (`FSD_DELTA.md`).
- [ ] Run API + web build/tests (shell unavailable in this session — run `npm test` in `codebase/api` and `npm run build` in `codebase/web`).
