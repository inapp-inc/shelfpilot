# Tasks — SEED-PI-05-api-create-branch

- [x] Env flag `PLAN_FIXTURE_IMPORT_ENABLED` (default `false`; set `true` for fixture import on create)
- [x] In `codebase/api/src/routes/layouts.js` POST create:
  - [x] If flag on && `importMeta.importMode === 'fixture'` && valid runs → `buildLayoutFromFixtureImport`
  - [x] Set `autoGenerateFixtures: false` implicitly for fixture path (client sends false)
  - [x] Populate `layout.importSource.fixtureImport`
  - [x] If runs empty with fixture mode → 400 via schema validation; flag off → packer fallback
- [x] Extend `codebase/api/test/floor-plan-import.test.js`:
  - [x] POST with fixture payload (synthetic runs) → shelves + aisles
  - [x] Flag off → ignore fixture mode (backward compatible)
- [x] Log `plan_fixture_import` JSON line (runCount, layoutId)
