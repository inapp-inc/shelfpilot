# SEED-PI — Plan fixture import (task index)

**Approved spec:** `Docs/PLAN_IMPORT_FIXTURE_LAYOUT_SPEC.md`  
**OpenSpec hub:** `openspec/changes/plan-fixture-import/` (`SEED-UNITS.md` has links)

| Order | ID | Folder | Start when |
|------:|----|--------|------------|
| 1 | SEED-PI-01 | `openspec/changes/SEED-PI-01-parser-scale/` | Now |
| 2 | SEED-PI-02 | `openspec/changes/SEED-PI-02-fixture-grammar/` | PI-01 merged |
| 3 | SEED-PI-03 | `openspec/changes/SEED-PI-03-openapi-import-model/` | PI-01 merged |
| 4 | SEED-PI-04 | `openspec/changes/SEED-PI-04-fixture-to-layout/` | PI-02 + PI-03 |
| 5 | SEED-PI-05 | `openspec/changes/SEED-PI-05-api-create-branch/` | PI-04 merged |
| 6 | SEED-PI-06 | `openspec/changes/SEED-PI-06-client-analyze/` | PI-02 merged |
| 7 | SEED-PI-07 | `openspec/changes/SEED-PI-07-create-modal-preview/` | PI-05 + PI-06 |
| 8 | SEED-PI-08 | `openspec/changes/SEED-PI-08-geometry-placement/` | PI-05 merged |
| 9 | SEED-PI-09 | `openspec/changes/SEED-PI-09-raster-ocr/` | PI-06 (optional for PDF-first) |
| 10 | SEED-PI-10 | `openspec/changes/SEED-PI-10-validation-handover/` | PI-07+ |

**Agent prompt for each slice:**

```text
Implement only openspec/changes/SEED-PI-0N-*/tasks.md.
Do not implement later SEED-PI units.
Reference: Docs/PLAN_IMPORT_FIXTURE_LAYOUT_SPEC.md
```
