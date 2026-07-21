# SEED-CF-08 — Validation, OpenAPI, handover

**Change:** `layout-client-feedback` · **Status:** Pending review

## Goal
Close out the client feedback change with tests, API docs, and spec fold readiness.

## Scope
- Update `Docs/openapi.yaml` for envelope + review endpoints
- API tests: envelope persist, autogen containment, review gating, reject comment
- Run `npm test` (api) + `npm run build` (web)
- Fold spec deltas into `openspec/specs/**` on closeout
- Apply `FSD_DELTA.md` to `Docs/FSD_ShelfPilot.md`

## Constraints
- All SEED-CF-01…07 acceptance criteria met before closeout

## Acceptance criteria
- [ ] Full API test suite passes
- [ ] Web build succeeds
- [ ] OpenAPI documents new fields and review routes
- [ ] REVIEW.md decisions recorded and tasks.md checked off

## Evidence
- CI/local test output
- Updated openapi.yaml diff

## Risks & rollback
- N/A (validation slice)

## Spec link
`openspec/changes/layout-client-feedback/`
