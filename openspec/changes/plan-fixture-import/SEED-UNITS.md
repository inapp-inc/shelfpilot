# SEED-PI units — execution order

Implement **one folder / one PR at a time** in this order. Each row links to `openspec/changes/<folder>/`.

| # | SEED-ID | Folder | Depends on | PR-sized goal |
|---|---------|--------|------------|---------------|
| 1 | SEED-PI-01 | [SEED-PI-01-parser-scale](../SEED-PI-01-parser-scale/) | — | Scale `1:N`, mm→m, aisle width hints |
| 2 | SEED-PI-02 | [SEED-PI-02-fixture-grammar](../SEED-PI-02-fixture-grammar/) | PI-01 | AMBIENT / BAYS / DOORS / KALEA runs |
| 3 | SEED-PI-03 | [SEED-PI-03-openapi-import-model](../SEED-PI-03-openapi-import-model/) | PI-01 | OpenAPI + JSON schema for `floorPlanImport` |
| 4 | SEED-PI-04 | [SEED-PI-04-fixture-to-layout](../SEED-PI-04-fixture-to-layout/) | PI-02, PI-03 | Service: runs → shelves + aisles |
| 5 | SEED-PI-05 | [SEED-PI-05-api-create-branch](../SEED-PI-05-api-create-branch/) | PI-04 | Wire POST `/layouts` + feature flag |
| 6 | SEED-PI-06 | [SEED-PI-06-client-analyze](../SEED-PI-06-client-analyze/) | PI-01, PI-02 | Extend analyze; build create payload |
| 7 | SEED-PI-07 | [SEED-PI-07-create-modal-preview](../SEED-PI-07-create-modal-preview/) | PI-06 | Preview table, mode, confirm envelope |
| 8 | SEED-PI-08 | [SEED-PI-08-geometry-placement](../SEED-PI-08-geometry-placement/) | PI-04, PI-05 | PDF positions; BOH obstacles optional |
| 9 | SEED-PI-09 | [SEED-PI-09-raster-ocr](../SEED-PI-09-raster-ocr/) | PI-06 | Server OCR + scale bar for PNG |
| 10 | SEED-PI-10 | [SEED-PI-10-validation-handover](../SEED-PI-10-validation-handover/) | PI-07+ | E2E, HANDOVER, fold spec, QA Layout1/2 |

## Parallelism

- After **PI-02**, **PI-03** can run in parallel with **PI-04** prep (types only).
- **PI-06** can start after **PI-02** (client-only) but full create E2E needs **PI-05**.
- **PI-09** is optional for PDF-first demos; required for `Layout1.png` / `Layout2.png` without PDF text.

## Copy-paste dispatch

When starting a unit, point the agent at:

```text
Implement openspec/changes/SEED-PI-0N-*/tasks.md only. Do not start later SEED-PI units.
Spec: Docs/PLAN_IMPORT_FIXTURE_LAYOUT_SPEC.md
```
