# SEED-CF-05 — Side rail tab alignment

**Change:** `layout-client-feedback` · **Status:** Pending review

## Goal
Fix Properties / Merchandising / Zones tab alignment when Merchandising content is long or scrolls.

## Scope
- Tab strip fixed at top of side rail (`flex-shrink: 0`)
- Only `.editor-rail-body` scrolls
- Merchandising panel: prevent horizontal overflow / button wrap shift
- Verify alignment across all three tabs

## Constraints
- No functional change to tab content
- Match existing editor visual style

## Acceptance criteria
- [ ] Scroll long Merchandising list → tabs stay aligned, no horizontal shift
- [ ] Same tab positions when switching Properties ↔ Merchandising ↔ Zones
- [ ] Works at 100% and 125% browser zoom

## Evidence
- Manual tab switch + scroll on shelf with long planogram

## Risks & rollback
- Low: CSS/layout only

## Spec link
`openspec/changes/layout-client-feedback/specs/ui-fidelity/spec.md`
