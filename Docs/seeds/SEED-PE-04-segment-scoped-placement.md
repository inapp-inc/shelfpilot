# SEED-PE-04 — Segment-scoped placement from visual editor

**Change:** `shelf-planogram-visual-editor` · **Status:** Draft — pending review

## Goal
Add, edit, and remove products **per level × bay × face** from the planogram grid with correct facing capacity.

## Scope
- Pass `segmentId` to planogram preview and POST
- Inline **facings** and **depthFacings** edit + remove on product blocks
- API stores `depthFacings` / `maxDepthFacings` on placement
- One SKU per bay per level (v1) with replace prompt
- Show preview suggestions (front, depth, levels)

## Constraints
- Reuse existing planogram endpoints — no new routes
- Clamp facings to maxFacings server-side

## Acceptance criteria
- [ ] Preview with segmentId returns segment-scoped maxFacings
- [ ] Add on Bay 2 uses 1/3 shelf width for capacity
- [ ] faceId B placement not visible on Face A grid
- [ ] API test for preview segmentId

## Evidence
- `test/planogram.test.js` or new test case for preview segmentId
- Manual end-to-end: split → add → switch face

## Risks & rollback
- Low — API already supports segmentId; wire UI only

## Spec link
`openspec/changes/shelf-planogram-visual-editor/specs/planogram/spec.md`
