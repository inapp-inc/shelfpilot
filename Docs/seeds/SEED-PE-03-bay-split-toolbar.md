# SEED-PE-03 — Bay split toolbar in planogram editor

**Change:** `shelf-planogram-visual-editor` · **Status:** Draft — pending review

## Goal
Let Designers **split shelves horizontally** into bays from the planogram editor with equal, custom, and merge actions.

## Scope
- `SegmentSplitControls.jsx` + draggable dividers on level grid
- Drag resize between bays (0.05 m snap, min 0.2 m per bay)
- Toolbar: Equal split (2–12), merge all, custom width fallback
- Per-segment `fillMode` toggle
- Optional segment `label` (if REVIEW Q5 approved)
- PATCH shelf `segments` via existing API
- Re-split confirmation when placements orphaned

## Constraints
- Segments shared across Face A/B (physical shelf geometry)
- Depends on SEED-LD-05 segment API (done)

## Acceptance criteria
- [ ] Split 3.6 m shelf into 3×1.2 m bays from modal
- [ ] Custom widths with sum validation
- [ ] Merge resets to single bay
- [ ] Partial fill mode shows hatched gap in grid cell
- [ ] Re-split prompts before deleting orphan placements

## Evidence
- Manual: split → verify canvas dividers sync
- API test: segment PATCH still passes overlap/range checks

## Risks & rollback
- Orphan handling UX — default confirm+delete per REVIEW.md

## Spec link
`openspec/changes/shelf-planogram-visual-editor/specs/planogram/spec.md`

## Related
Completes merchandising UX deferred from `SEED-LD-06-bay-split-ui.md`.
