# SEED-LD-05 — Shelf segments model + API + OpenAPI

**Change:** `layout-dimensions-rotation-shelf-bays` · **Status:** Pending review

## Goal
Add shelf bay segments to the data model with validation and segment-scoped planogram capacity.

## Scope
- `normalizeShelfSegments()` — overlap/range checks
- `Shelf.segments[]` on layout normalize
- PATCH shelf with segments; errors `segment_overlap`, `segment_out_of_range`
- Planogram POST optional `segmentId`; max facings from segment width
- `Docs/openapi.yaml` updates

## Constraints
- Back-compat: missing segments ⇒ one implicit full-width bay
- Segments are merchandising metadata; single physical fixture

## Acceptance criteria
- [ ] 3 equal segments on 3.6 m shelf normalize correctly
- [ ] Overlap rejected with `segment_overlap`
- [ ] Facings on segment uses segment width in unit test

## Evidence
- New API unit tests
- OpenAPI lint / contract check

## Risks & rollback
- Medium: planogram migration — legacy placements map to implicit segment
- Rollback: ignore `segments[]` in normalize (feature flag optional)

## Spec link
`openspec/changes/layout-dimensions-rotation-shelf-bays/specs/planogram/spec.md`

## Engineering
- Security: validate numeric bounds on segment widths — input validation
- Performance: N/A
- Observability: N/A
