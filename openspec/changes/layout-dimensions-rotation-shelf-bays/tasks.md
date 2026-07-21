# Tasks — layout-dimensions-rotation-shelf-bays

**Status:** Implemented — 2026-07-21

---

## SEED-LD-01 — Dimension overlays (web)

- [x] Add `.aisle-dim` secondary label on every aisle in `Canvas2D.jsx` (`run × width m`).
- [x] Show `.fixture-dim` chip on **selected** shelf with usable W × D.
- [x] Extend `selectionInfo` in `LayoutEditor.jsx` with dimension strings for aisle/shelf.
- [x] Add styles in `styles.css` (mono, readable at 50–500% zoom).

## SEED-LD-02 — Containment hardening (web + API test)

- [x] Add `entityFitsPolygon` helper in `polygonCanvas.js` (mirror server rules for shelves + aisles).
- [x] Update drag preview in `LayoutEditor.jsx` to block moves outside polygon.
- [x] Remove `visibleShelves` hide filter; render violations with `.fx-violation` styling.
- [x] Validation banner: click selects first containment violation entity.

## SEED-LD-03 — Arbitrary shelf rotation (API + web + 3D)

- [x] Update `shelfFloorFootprint` / `entityInsideLayout` in `polygonContainment.js` to corner-based rotation.
- [x] Normalize `rotationDeg` to `[0, 360)` in `shelfSegments.js` / `normalizeShelf`.
- [x] Canvas: apply CSS rotation + rotation drag handle (Shift = 15° snap) in `Canvas2D.jsx`.
- [x] Properties panel: numeric rotation input + ±90° buttons in `PropertiesPanel.jsx`.
- [x] `Scene3D.jsx`: apply shelf `rotationDeg` on Y axis.
- [x] Unit tests: 45° shelf inside/outside square polygon — `test/rotation-segments.test.js`.

## SEED-LD-04 — Shelf badge readability (web)

- [x] Extract `ShelfBadge.jsx` from `Canvas2D.jsx`.
- [x] Implement responsive sizing (full / stacked / compact + tooltip).

## SEED-LD-05 — Shelf segments model + API + OpenAPI

- [x] Add `shelfSegments.js` with normalize, overlap/range validation.
- [x] `segments[]` on shelf via `normalizeShelf`.
- [x] PATCH shelf accepts `segments` array; errors `segment_overlap`, `segment_out_of_range`.
- [x] Planogram POST/preview accepts optional `segmentId`; max facings uses segment width.
- [x] Update `Docs/openapi.yaml`: `ShelfSegment`, `Shelf.segments`, planogram `segmentId`.

## SEED-LD-06 — Bay split UI + segment planogram (web)

- [x] Merchandising panel: Segments section (split 2/3/4, merge, fill toggle).
- [x] Active segment tab scopes planogram preview + placement.
- [x] Canvas: segment divider lines + partial-fill hatching on selected shelf.

## SEED-LD-07 — Docs, specs, validation

- [x] Spec deltas authored in change folder (fold to canonical specs on next docs pass).
- [x] `REVIEW.md` approved; `proposal.md` status updated.
- [x] Run `npm test` (rotation-segments + zones-aisles) and `npm run build` (web) — pass.
- [ ] Fold spec deltas into `openspec/specs/**` and apply `FSD_DELTA.md` (deferred closeout).
- [ ] Update `Docs/HANDOVER.md` (deferred closeout).

## Traceability

| Spec ref | SEED | Primary files |
|----------|------|---------------|
| Dimension overlays | LD-01 | `Canvas2D.jsx`, `LayoutEditor.jsx`, `styles.css` |
| Containment hardening | LD-02 | `polygonCanvas.js`, `LayoutEditor.jsx` |
| Arbitrary rotation | LD-03 | `polygonContainment.js`, `Canvas2D.jsx`, `Scene3D.jsx`, `PropertiesPanel.jsx` |
| Badge readability | LD-04 | `ShelfBadge.jsx` |
| Shelf segments API | LD-05 | `shelfSegments.js`, `layouts.js`, `openapi.yaml` |
| Bay split UI | LD-06 | `MerchandisingPanel.jsx`, `Canvas2D.jsx` |
