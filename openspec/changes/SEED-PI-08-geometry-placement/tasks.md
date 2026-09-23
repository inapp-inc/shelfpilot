# Tasks — SEED-PI-08-geometry-placement

- [x] Extend PDF extract in `floorPlanImport.js` to retain text items `{ str, x, y }` (pdf.js text content)
- [x] Shared helper `associateLabelsToRuns(runs, textItems, scale)` → geometry per run (`floorPlanGeometry.mjs`)
- [x] `planFixtureImport.js`: use geometry when present; else keep PI-04 grid fallback
- [x] Optional: parse BOH keywords → `layout.obstacles[]` via `parseBackOfHouseObstacles` + `planText` on import
- [x] Tests: `floor-plan-geometry.test.js`
- [x] OpenAPI `run.geometry` documented (anchor + center fields)
