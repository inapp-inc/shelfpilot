# Tasks — SEED-PI-03-openapi-import-model

- [x] Update `Docs/openapi.yaml`:
  - [x] Extend `FloorPlanImport` (or inline schema) with `importMode`, `scale`, `storeEnvelope`, `runs[]`, `aisleHints[]`, `warnings[]`
  - [x] Document `run.geometry` optional until PI-08
- [x] Add `codebase/api/src/services/planFixtureImportSchema.js` (or zod/joi lightweight validation) — max runs, numeric bounds
- [x] Extend `layout.importSource` shape in `layoutNormalize.js` / types comment for `fixtureImport: { scale, runCount, warnings, parserVersion }`
- [x] Test: invalid run (negative length) → 400 on create when fixture mode (`plan-fixture-import.test.js` schema unit test; route in PI-05)
- [x] Cross-link `Docs/PLAN_IMPORT_FIXTURE_LAYOUT_SPEC.md` §8 to OpenAPI operationId
