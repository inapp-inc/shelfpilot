# SEED-LD-06 — Bay split UI + segment planogram

**Change:** `layout-dimensions-rotation-shelf-bays` · **Status:** Pending review

## Goal
Let Designers split shelves into bays and place products per bay with full/partial fill modes.

## Scope
- Merchandising panel: split equally, custom widths, merge, fill toggle
- Active segment tab for planogram picker
- Canvas segment dividers + partial-fill hatching
- Depends on SEED-LD-05 API

## Constraints
- Designer/Admin only (existing RBAC)
- Shared split across Face A/B on same physical shelf (see REVIEW.md)

## Acceptance criteria
- [ ] Split 3.6 m shelf into 3×1.2 m bays via UI
- [ ] Product on bay 2 shows max facings for 1.2 m only
- [ ] Partial segment shows unused space visually

## Evidence
- Manual end-to-end: split → assign category → place product on segment 2
- Web build passes

## Risks & rollback
- Medium UX complexity — ship behind nothing (full release) or defer partial fill visuals
- Rollback: hide Segments UI section; API data ignored

## Spec link
`openspec/changes/layout-dimensions-rotation-shelf-bays/specs/planogram/spec.md`
