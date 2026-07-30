# Tasks — demo-feedback-jul-2026

**Status:** Implemented — 2026-07-29  
**Reference:** [proposal.md](./proposal.md)

---

## Suggested implementation order

DF-02 (alignment interim) → DF-01 → DF-04 → DF-05 → DF-03 → DF-06 → DF-07 → DF-08

WebGL (DF-03) can run in parallel with DF-01/DF-05 after alignment baseline is verified.

---

## SEED-DF-01 — Aisle-centric shelf numbering (API + web)

- [ ] Add `aisleNumber` (integer, 1-based) to aisle model; assign in packer along primary flow direction.
- [ ] Add `shelfIndexAlongAisle` (0-based letter index: 0→A, 1→B, …) per shelf face binding.
- [ ] Label helpers: `aisleShelfLabel(aisleNumber, index)` → `"4A"`; `aisleShelfFaceLabel(aisleNumber, index, faceId)` for dual-face edge cases.
- [ ] Dual-face: front face uses customer-facing `aisleId` number; back face uses opposite aisle number from spine geometry.
- [ ] Update `assignDisplayNumbers` → `assignAisleShelfLabels` (keep `displayNumber` for sort order if needed).
- [ ] Canvas/WebGL badges, Properties, Merchandising, Planogram, legend — all use new labels.
- [ ] Migration: re-label existing layouts on load (derive from `aisleId` + position) or one-time admin regen.
- [ ] Tests: 4-aisle autogen → labels `4A`, `4B`; back face → opposite aisle; selection consistency.

## SEED-DF-02 — 2D alignment fixes (interim, web)

- [ ] Audit shelf/aisle placement math in `layoutPacker.js` + `Canvas2D.jsx` merge logic.
- [ ] Snap shelf origin to aisle spine + half-depth offset; fix vertical vs horizontal runway offsets.
- [ ] Gondola pair: single merged hit target; spine at geometric centre.
- [ ] Aisle centrelines align with shelf long edge; min gap validation visualised on canvas.
- [ ] Add alignment regression test fixtures (horizontal-only, vertical-only, mixed orientation).
- [ ] Manual QA checklist for demo layout templates.

## SEED-DF-03 — WebGL 2D floor plan (web)

- [x] Hybrid `FloorPlan2D`: WebGL background (grid, envelope, fixture zone) + Canvas2D entity overlay.
- [x] Canvas2D parity: aisle labels, 4A/4B, gondola faces, hover, drag, rotate, resize unchanged.
- [x] Default-on hybrid (`VITE_USE_WEBGL_2D=false` for SVG-only fallback).
- [x] Draw/edit-area modes still use full Canvas2D.
- [ ] Performance: 200+ fixtures at 60 fps on demo laptop.

## SEED-DF-04 — Dimension-first store envelope (web + API)

- [ ] Meter bar: editable **Store W** / **Store D** inputs (metres, 0.5 step).
- [ ] Live update `storeEnvelope` rect on change (debounced PATCH).
- [ ] Draw area mode: show envelope rect as guide; fixture polygon inside.
- [ ] Edit envelope mode: drag corner handles **or** type dimensions (sync both ways).
- [ ] Validation: fixture polygon must stay inside envelope; warn if not.
- [ ] OpenAPI: document envelope PATCH fields if not already explicit.

## SEED-DF-05 — Shelf hover product preview (web)

- [ ] Resolve hovered shelf + face from pick/hit-test.
- [ ] Fetch or use cached planogram products for face (avoid N+1 — batch on layout load).
- [ ] Tooltip component: face label, category, product list (max 8 + overflow count).
- [ ] 500 ms hover debounce; hide on mouse leave / selection change.
- [ ] Empty state copy; keyboard focus equivalent.

## SEED-DF-06 — Smart Generate v2 (API + web)

- [ ] Packer: equalise aisle widths where possible; eliminate sub-10 cm gaps between shelf and aisle.
- [ ] Post-pack: `bindShelvesToAisles` + `assignAisleNumbers` + DF-01 labels.
- [ ] Product fill: improve category ID resolution; fill both faces of gondola pairs; report `productsPlaced / productsEligible`.
- [ ] UI: coverage bar in Smart Generate panel; warnings for empty categories.
- [ ] Optional preview mode (ghost fixtures, Apply to commit).
- [ ] Block generate when no fixture polygon.
- [ ] Tests: demo L-polygon, mixed orientation, product fill rate.

## SEED-DF-07 — Dashboard rework (web + optional API)

- [ ] Design new dashboard layout (see design.md §6).
- [ ] Status pipeline component with counts by `draft` / `in_review` / `approved` / `rejected`.
- [ ] Featured layout card: mini preview (static thumbnail or lazy WebGL snapshot).
- [ ] Quick actions: New layout, Open last, Approvals queue (approver role).
- [ ] Consolidate KPIs; single combined chart row.
- [ ] Recent layouts list with status badges (reuse Layouts card styling).
- [ ] Optional: `GET /analytics/portfolio/summary` for pipeline counts if not derivable client-side.
- [ ] Empty/demo state for first-time users.

## SEED-DF-08 — Docs, tests, validation

- [ ] Spec deltas in `specs/` (layouts, ui-fidelity, dashboard).
- [ ] OpenAPI: `aisleNumber`, label fields, portfolio summary endpoint if added.
- [ ] API tests: aisle numbering, label assignment, autogen v2.
- [ ] Web: component tests for label helpers + tooltip.
- [ ] Run `npm test` (api) + `npm run build` (web).
- [ ] Fold `FSD_DELTA.md` → `Docs/FSD_ShelfPilot.md` after approval.
- [ ] Update handover / demo script for July feedback items.
