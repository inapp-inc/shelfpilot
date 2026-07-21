# SEED-DF-06 — Validation, spec fold, handover

**Change:** `dual-face-numbered-shelves-strict-polygon` · **Status:** Pending review

## Scope
- Fold spec deltas into `openspec/specs/{layouts,planogram,ui-fidelity}/`
- Apply `FSD_DELTA.md` → `Docs/FSD_ShelfPilot.md` §5f
- Update `Docs/HANDOVER.md` + seeds README (Done)
- Feature flags: `DUAL_FACE_SHELVES`, `STRICT_POLYGON_CANVAS`

## Acceptance
- All API tests pass (target ≥ 32 with new cases)
- `npm run build` web succeeds
- OpenAPI v0.7.0 published in `Docs/openapi.yaml`

## Evidence
- Test run log
- REVIEW checklist signed off
