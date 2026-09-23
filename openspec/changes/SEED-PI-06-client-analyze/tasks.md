# Tasks — SEED-PI-06-client-analyze

- [x] Import shared parsers in `codebase/web/src/floorPlanImport.js`
- [x] Extend `analyzeFloorPlanUpload` return value:
  - [x] `fixturePlan: { importMode, scale, runs, aisleHints, warnings, parserVersion }`
  - [x] Auto-set `importMode: 'fixture'` when `runs.length > 0`, else `'envelope'`
- [x] Update `App.jsx` create body via `floorPlanImportPayloadFromDraft`
- [x] Web test: `codebase/web/src/floorPlanImport.test.js` (Layout2 text extract)
- [x] Shared module used by web (same as `floorPlanDimensions.mjs`)
