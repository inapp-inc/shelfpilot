# Tasks: layout-editor-planogram

Change: `openspec/changes/layout-editor-planogram/`  
Plan SEEDs: `Docs/seeds/SEED-LE-*.md`

## SEED checklist

- [x] SEED-LE-00-model-openapi — OpenAPI + SQLite/payload model; fixtures→shelves migration
- [x] SEED-LE-01-component-split — Extract `layout-editor/**` (parity, no planogram UI yet)
- [x] SEED-LE-02-dnd-canvas — Drag-and-drop place/move; persist PATCH
- [x] SEED-LE-03-aisle-shelf-config — Aisle space + shelf height/levels/usable width
- [x] SEED-LE-04-category-separate — Independent aisle vs shelf category mapping
- [x] SEED-LE-05-planogram-facings — Products on shelf front; facing calc + tests
- [x] SEED-LE-06-3d-upgrade — Richer Three.js (levels + facings)
- [x] SEED-LE-07-validation-handover — Tests, UI checklist, handover note

## Evidence gates

- [x] `Docs/openapi.yaml` updated before each API shape change
- [x] API tests for facing math and separate mappings (`npm test` — 17 pass)
- [x] UI modular editor under `codebase/web/src/layout-editor/**`; App thin shell
- [ ] Intent review before merge (manual PRs)

## Status

**Implemented** (demo stack). Change approved and delivered through SEED-LE-00…07.
