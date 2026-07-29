# SEED-LD-06 — Bay split UI + segment planogram

**Change:** `layout-dimensions-rotation-shelf-bays` · **Status:** Superseded in part by `shelf-planogram-visual-editor` (2026-07-24)

> **Note:** Segment API (SEED-LD-05) is implemented. Canvas dividers exist. Full bay-split
> merchandising UX moves to the **Planogram visual editor** (SEED-PE-03). Merchandising
> panel segment controls deferred to that change.

## Goal
Let Designers split shelves into bays and place products per bay with full/partial fill modes.

## Scope
- ~~Merchandising panel: split equally, custom widths, merge, fill toggle~~ → **Planogram editor modal** (SEED-PE-03)
- ~~Active segment tab for planogram picker~~ → **Segment columns in level grid** (SEED-PE-02/04)
- Canvas segment dividers + partial-fill hatching — **done**
- Depends on SEED-LD-05 API — **done**

## Constraints
- Designer/Admin only (existing RBAC)
- Shared split across Face A/B on same physical shelf (see REVIEW.md)

## Acceptance criteria
- [x] Canvas segment dividers on selected shelf
- [ ] Split 3.6 m shelf into 3×1.2 m bays via **Planogram editor** (SEED-PE-03)
- [ ] Product on bay 2 shows max facings for 1.2 m only (SEED-PE-04)
- [ ] Partial segment shows unused space visually (SEED-PE-02)

## Evidence
- Manual end-to-end: split → assign category → place product on segment 2
- Web build passes

## Risks & rollback
- Medium UX complexity — ship via planogram modal (SEED-PE-01)
- Rollback: hide Open Planogram; API data ignored

## Spec link
`openspec/changes/shelf-planogram-visual-editor/specs/planogram/spec.md` (primary)
`openspec/changes/layout-dimensions-rotation-shelf-bays/specs/planogram/spec.md` (segment model)
