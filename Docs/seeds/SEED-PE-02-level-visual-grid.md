# SEED-PE-02 — Level-row visual planogram grid

**Change:** `shelf-planogram-visual-editor` · **Status:** Draft — pending review

## Goal
Show each shelf **level as a horizontal row** with product blocks per bay so Designers see the full fixture at a glance.

## Scope
- `PlanogramLevelGrid.jsx`, `PlanogramSegmentRow.jsx`, `PlanogramProductBlock.jsx`
- Levels ordered bottom-up (level 0 = floor)
- Proportional bay columns from `shelf.segments[]`
- Product blocks: name, facings/maxFacings, fill bar
- Empty cell + footer summary (counts, fill warnings)

## Constraints
- Render one shelf only (no multi-select)
- Reuse category colors from layout mapping

## Acceptance criteria
- [ ] 4-level shelf shows 4 rows in correct order
- [ ] Placement on L1 Bay 2 appears only in that cell
- [ ] Empty bays show add affordance
- [ ] Footer shows placement and warning counts

## Evidence
- Manual: place products on multiple levels; verify grid
- Web build passes

## Risks & rollback
- Medium layout complexity on narrow viewports — provide stacked fallback

## Spec link
`openspec/changes/shelf-planogram-visual-editor/specs/planogram/spec.md`
