# Tasks — SEED-PI-04-fixture-to-layout

- [x] Add `codebase/api/src/services/planFixtureImport.js`:
  - [x] `buildLayoutFromFixtureImport(layout, importPayload, { categories, templates })`
  - [x] Map `kind` → fixture type / defaults (`categoryFixtureDefaults`, `fixtureCatalog` patterns)
  - [x] Set `usableWidthMeters`, `depthMeters`, `defaultLevels` from run
  - [x] Create aisles from `aisleHints` + run pairing heuristics (min aisle width from layout settings)
  - [x] **Stub geometry:** place runs in rows with spacing when `geometry` missing (document algorithm)
  - [x] `deriveStoreEnvelopeFromRuns(runs, marginM)` for FR-SCALE-03 when L×W absent
- [x] Unit tests:
  - [x] Two ambient runs 9m + 10m → 2 shelves with correct widths
  - [x] Chiller kind → freezer/chiller fixture type id
  - [x] Envelope derived ≥ max run extent + margin
- [x] Do **not** wire routes yet (PI-05)
