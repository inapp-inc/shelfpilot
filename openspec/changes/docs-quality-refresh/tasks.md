# Tasks: docs-quality-refresh

Status legend: `[x]` done · `[ ]` pending

## SEED-DR-00 — Recheck audit
- [x] Enumerate all docs from LE/AG/ML in `AUDIT.md`
- [x] Verify ground-truth numbers (25 tests / 36 ops / SQLite / OpenAPI 0.5.0)
- [x] Classify findings by severity (S1–S3)

## SEED-DR-01 — Baseline spec consolidation
- [x] Draft `planogram` delta (category-gate, per-level, type levels)
- [x] Draft `layouts` delta (first-class shelves/aisles, polygon containment, autogenerate)
- [x] Draft `catalog` delta (product update)
- [x] Draft `ui-fidelity` delta (draw/generate, per-level panel, wheel-zoom, Orbit/Walk)
- [x] **APPLIED:** copied into `openspec/specs/{planogram,layouts,catalog,ui-fidelity}/spec.md`

## SEED-DR-02 — Cross-cutting doc corrections
- [x] `Docs/VALIDATION_REPORT.md` — 25/36/SQLite + capability rows
- [x] `Docs/HANDOVER.md` — §4 and §5 numbers to 25/36
- [x] `Docs/SEED_INTENT_REVIEW.md` — fix persistence, add LE/AG/ML section
- [x] `Docs/seeds/README.md` — statuses + AG/ML/DR tables
- [x] `Docs/FSD_ShelfPilot.md` — summary + traceability

## SEED-DR-03 — Verify
- [x] `npm run openapi:check` — 36 ops
- [x] `npm test` — 25 passed
- [x] Grep stale numbers resolved in primary docs
