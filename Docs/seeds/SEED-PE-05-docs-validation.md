# SEED-PE-05 — Docs, OpenAPI, validation handover

**Change:** `shelf-planogram-visual-editor` · **Status:** Draft — pending review

## Goal
Align OpenAPI and FSD with the visual planogram editor; prove delivery with tests and manual checklist.

## Scope
- Update `Docs/openapi.yaml` (preview segmentId, placement faceId/segmentId, segment label)
- Fold spec deltas to canonical on closeout
- Apply `FSD_DELTA.md`
- Run api tests + web build
- Manual verification checklist in `tasks.md`

## Acceptance criteria
- [ ] OpenAPI documents segmentId on planogram preview request
- [ ] PlanogramPlacement includes faceId and segmentId in schema
- [ ] All api tests pass
- [ ] Web build passes
- [ ] Manual checklist signed off

## Evidence
- `npm test` in codebase/api
- `npm run build` in codebase/web
- Completed checklist in tasks.md

## Spec link
`openspec/changes/shelf-planogram-visual-editor/FSD_DELTA.md`
