# SEED-LD-03 — Arbitrary shelf rotation

**Change:** `layout-dimensions-rotation-shelf-bays` · **Status:** Pending review

## Goal
Allow shelves to rotate to any angle with correct containment, 2D canvas, and 3D rendering.

## Scope
- Corner-based `shelfFloorFootprint` in `polygonContainment.js`
- API: normalize rotationDeg 0–360; reject outside polygon
- Canvas: CSS transform + rotation handle (Shift = 15° snap)
- Properties: rotation input + ±90° buttons
- `Scene3D.jsx`: Y-axis rotation

## Constraints
- Autogen unchanged (0°/90° only)
- Integer degrees unless REVIEW.md selects 0.5° steps

## Acceptance criteria
- [ ] 45° shelf inside square polygon saves successfully
- [ ] Rotated shelf outside polygon rejected on PATCH
- [ ] 2D and 3D match after reload

## Evidence
- Unit tests in `test/zones-aisles.test.js` or new rotation test file
- Manual rotate + reload

## Risks & rollback
- Medium: concave polygon edge cases — test thoroughly
- Rollback: clamp rotation to 0/90 in normalize (data compat)

## Spec link
`openspec/changes/layout-dimensions-rotation-shelf-bays/specs/layouts/spec.md`

## OpenAPI
Document `rotationDeg` 0–360 on Shelf schema (SEED-LD-05 may consolidate)
