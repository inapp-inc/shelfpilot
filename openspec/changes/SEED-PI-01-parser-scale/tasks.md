# Tasks — SEED-PI-01-parser-scale

- [x] Add `codebase/shared/floorPlanFixtures.mjs` (or extend `floorPlanDimensions.mjs` if minimal) with:
  - [x] `parseDrawingScaleFromText(text)` → `{ ratio, method, matched }` (e.g. `1:50`, `1 : 50`)
  - [x] `parseMillimetreDimensions(text)` → list of `{ valueMeters, raw, context }` with sane caps
  - [x] `parseAisleWidthHints(text)` → `{ widthMeters, source }[]` (FR-SCALE-02)
  - [x] Export `PARSER_VERSION` constant
- [x] Add `codebase/api/test/floor-plan-fixtures-scale.test.js` (or colocated shared test):
  - [x] `Scale 1:50` from Layout2-style string
  - [x] `1500` / `1250` mm aisle context
  - [x] No false positives on random 4-digit grid numbers (basic heuristics)
- [x] Document scale math in module header (architect 1:N → metres per paper unit at standard PDF viewport — note assumption for PI-08)
- [x] Run API tests: `node --test test/floor-plan-fixtures-scale.test.js`
