# Proposal: Architect plan import — fixture & aisle generation

**Status:** Approved — implement via SEED-PI units (2026-09-17)  
**Product spec:** `Docs/PLAN_IMPORT_FIXTURE_LAYOUT_SPEC.md`  
**Review:** `REVIEW.md`

## Summary

Extend the existing **floor plan upload** path so architect drawings (see `Docs/plan/`) can drive **real shelf and aisle geometry** from **fixture-level dimensions** (ambient run lengths, mm aisle widths, bay/shelf counts, chiller/freezer labels, drawing scale), not only store L×W + generic packer.

## Deliverables (by SEED unit)

| Order | SEED-ID | Change folder | Outcome |
|------:|---------|---------------|---------|
| 1 | SEED-PI-01 | `SEED-PI-01-parser-scale` | Shared scale + mm + envelope helpers |
| 2 | SEED-PI-02 | `SEED-PI-02-fixture-grammar` | Parse runs (AMBIENT, BAYS, KALEA, …) |
| 3 | SEED-PI-03 | `SEED-PI-03-openapi-import-model` | OpenAPI + `importSource.fixtureImport` |
| 4 | SEED-PI-04 | `SEED-PI-04-fixture-to-layout` | `planFixtureImport.js` → shelves/aisles |
| 5 | SEED-PI-05 | `SEED-PI-05-api-create-branch` | POST `/layouts` fixture import branch + flag |
| 6 | SEED-PI-06 | `SEED-PI-06-client-analyze` | Client analyze + optional `analyze-plan` API |
| 7 | SEED-PI-07 | `SEED-PI-07-create-modal-preview` | Create dialog preview table + mode |
| 8 | SEED-PI-08 | `SEED-PI-08-geometry-placement` | Positions from PDF text / bounds |
| 9 | SEED-PI-09 | `SEED-PI-09-raster-ocr` | PNG scale bar + OCR (env-gated) |
| 10 | SEED-PI-10 | `SEED-PI-10-validation-handover` | E2E, docs fold, regression AT-6/AT-7 |

## Success criteria (program)

- Layout2-style text extracts produce runs with **~9 m / ~10 m** ambient lengths (±5% after scale confirm).
- Created layout has **aisles + shelves** from import; envelope-only imports **unchanged**.
- Smart Generate / planogram fill **does not wipe** imported shelf geometry.

## Out of scope (program)

ML symbol recognition; planogram SKU import from drawing; multi-page PDF picker; pixel-perfect CAD.

## Related code (baseline)

| Area | Path |
|------|------|
| Upload analyze | `codebase/web/src/floorPlanImport.js` |
| Store L×W parse | `codebase/shared/floorPlanDimensions.mjs` |
| Create | `codebase/web/src/modules/LayoutCreateModal.jsx`, `App.jsx` |
| API create | `codebase/api/src/routes/layouts.js` |
| Envelope import tests | `codebase/api/test/floor-plan-import.test.js` |
