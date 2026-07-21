# SEED-LD-04 — Shelf badge readability

**Change:** `layout-dimensions-rotation-shelf-bays` · **Status:** Pending review

## Goal
Improve display numbers on small and dual-face shelves so both sides are readable.

## Scope
- Extract `ShelfBadge.jsx` from `Canvas2D.jsx`
- Responsive modes: full / stacked / compact by pixel width
- Tooltips: `#12 Face A → Category`
- Optional mirror badge on opposite long edge for wide gondolas

## Constraints
- No API changes
- Must not regress dual-face colour coding

## Acceptance criteria
- [ ] No clipped `12A`/`12B` on shelves &lt; 36 px wide at 100% zoom
- [ ] Tooltip available for compact mode
- [ ] Legend still lists shelf numbers correctly

## Evidence
- Manual on dense autogen layout (mixed orientations)
- Optional component test for badge mode selection

## Risks & rollback
- Low; UI-only revert

## Spec link
`openspec/changes/layout-dimensions-rotation-shelf-bays/specs/ui-fidelity/spec.md`
