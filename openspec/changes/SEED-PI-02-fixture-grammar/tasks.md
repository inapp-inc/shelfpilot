# Tasks — SEED-PI-02-fixture-grammar

- [x] In `floorPlanFixtures.mjs` add:
  - [x] `parseFixtureRunsFromText(text)` → `{ runs, warnings, aisleHints }`
  - [x] Patterns: `AMBIENT 9m`, `AMBIENT 4.5m`, `AMBIENT VEG 3m`
  - [x] `(\d+) BAYS (\d+) SHELVES`
  - [x] `(\d+) DOORS (\d+) BAYS`
  - [x] `KALEA FREEZE` / `KALEA CHILLED` + optional model numbers (`3750` → length hint)
  - [x] `Low level shelving … (\d+)m long … (\d+)mm deep`
  - [x] `kind` enum: `ambient_gondola`, `chiller`, `freezer`, `low_level`, `unknown`
- [x] Add text fixture file `codebase/api/test/fixtures/layout2-text-extract.txt` (hand-curated from Layout2 labels)
- [x] Add text fixture `layout1-text-extract.txt` (subset for refrigeration + ambient)
- [x] Tests:
  - [x] Layout2 extract contains runs with length 9 and 10 m
  - [x] `4 BAYS 5 SHELVES` sets bayCount / levelCount
  - [x] Handwritten-only noise does not create runs (or low confidence + warning)
- [x] `mergeFixtureParse(scaleParse, fixtureParse)` helper for analyze pipeline
