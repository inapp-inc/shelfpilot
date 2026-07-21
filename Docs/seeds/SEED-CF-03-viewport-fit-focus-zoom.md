# SEED-CF-03 — Viewport-fit editor + focus zoom

**Change:** `layout-client-feedback` · **Status:** Pending review

## Goal
Fit the layout editor on screen without body scroll and let designers zoom to a category or current selection.

## Scope
- CSS: editor fills viewport; side rail scrolls internally
- Fit to view on editor open and after Apply area
- Focus dropdown in meter bar: categories + “Current selection”
- Pan/zoom canvas to bounding box of focused fixtures

## Constraints
- No change to layout data model
- Must work at 100% and 125% browser zoom on 1366×768

## Acceptance criteria
- [ ] Properties / Merchandising / Zones tabs reachable without document body scroll
- [ ] Fit to view frames full floor plan on open
- [ ] Focus → category zooms to shelves/aisles mapped to that category
- [ ] Focus → selection zooms to selected entity bounds

## Evidence
- Manual check at 1366×768
- Screenshot or checklist in validation handover

## Risks & rollback
- Low: CSS-only rollback for viewport; focus zoom is additive

## Spec link
`openspec/changes/layout-client-feedback/specs/ui-fidelity/spec.md`
