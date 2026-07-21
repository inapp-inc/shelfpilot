# SEED-LD-02 — Polygon containment hardening

**Change:** `layout-dimensions-rotation-shelf-bays` · **Status:** Pending review

## Goal
Prevent shelves and aisles from being placed or dragged outside the drawn floor area.

## Scope
- `entityFitsPolygon()` in `polygonCanvas.js` (0/90° footprints initially)
- Drag preview blocking in `LayoutEditor.jsx`
- Show violation shelves (remove silent hide); `.fx-violation` style
- Validation banner → select first violation

## Constraints
- Server remains authoritative (`containment_violation`)
- Must work on concave / L-shaped polygons

## Acceptance criteria
- [ ] Drag cannot preview position outside polygon
- [ ] Outside shelves visible with red violation outline
- [ ] API test: PATCH outside → 400

## Evidence
- `test/` containment case on L-polygon
- Manual drag test on irregular polygon

## Risks & rollback
- Medium: drag feel may feel "sticky" at edges — tune with user feedback
- Rollback: restore visibleShelves filter (not recommended)

## Spec link
`openspec/changes/layout-dimensions-rotation-shelf-bays/specs/layouts/spec.md`

## Engineering
- Security: N/A — client preview only
- Performance: N/A — O(1) per mousemove
- Observability: N/A
