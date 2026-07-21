# SEED-CF-06 — Resizable / editable polygon floor area

**Change:** `layout-client-feedback` · **Status:** Pending review

## Goal
Let designers draw a polygon for the fixture zone, then resize it by dragging vertices on the canvas.

## Scope
- New **Edit area** palette mode (or tool toggle)
- Drag vertices; optional edge midpoint handles
- Minimum 3 vertices; delete vertex when >3
- PATCH polygon on save; validate ring
- Re-check containment for existing fixtures after reshape

## Constraints
- Reuse zone resize handle patterns from Canvas2D where possible
- Invalid polygon rejected with clear error

## Acceptance criteria
- [ ] After Apply, enter Edit area → drag vertex → save persists new polygon
- [ ] Fixtures outside new polygon flagged or move blocked per containment rules
- [ ] Cannot save polygon with <3 vertices

## Evidence
- Manual vertex drag + reload
- API test: invalid ring rejected

## Risks & rollback
- Medium: accidental reshape may orphan fixtures; show containment warnings before save

## Spec link
`openspec/changes/layout-client-feedback/specs/layouts/spec.md`
