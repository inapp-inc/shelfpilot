# Design — plan fixture import

## Architecture

```
Upload (PNG/PDF/SVG)
    │
    ├─ Client: pdf.js text (PDF), readAsText (SVG), aspect (raster)
    │
    ▼
shared/floorPlanDimensions.mjs     (store L×W — existing)
shared/floorPlanFixtures.mjs       (scale, runs, aisleHints — new)
    │
    ├─ importMode: envelope  →  existing floorPlanImport + packer
    │
    └─ importMode: fixture   →  POST /layouts { floorPlanImport.runs[] }
              │
              ▼
       planFixtureImport.js
              │
              ├─ map runs → shelf records (fixture catalog)
              ├─ derive aisles (hints + parallel runs)
              └─ optional obstacles (PI-08)
              │
              ▼
       layout persisted; importSource.fixtureImport metadata
```

## Module placement

| Module | Location | Notes |
|--------|----------|--------|
| Parsers (pure) | `codebase/shared/floorPlanFixtures.mjs` | Used by web + api tests |
| Text fixtures | `codebase/shared/floorPlanFixtures.test.mjs` or `api/test/` | Snippets from Layout1/2 |
| Layout builder | `codebase/api/src/services/planFixtureImport.js` | Side-effect: mutates layout |
| Analyze API | `POST /layouts/analyze-plan` | PI-06/09; multipart or JSON text extract |
| Feature flag | `PLAN_FIXTURE_IMPORT_ENABLED` | Default off until PI-05 merge |

## Import mode selection

1. If parsed `runs.length >= 1` and user confirms **fixture import** → `importMode: fixture`, `autoGenerateFixtures: false`.
2. Else if store L×W parsed or manual → existing path (`importMode: envelope` or omit).
3. If fixture parse empty → warning + **packer fallback** (Q6).

## Fixture type mapping (v1 table)

| Keyword / kind | Fixture direction |
|----------------|-------------------|
| `AMBIENT`, `ambient_gondola` | Standard gondola template |
| `KALEA CHILLED`, `chiller` | Chiller / multideck defaults |
| `KALEA FREEZE`, `freezer` | Freezer template |
| Unknown | Generic gondola + `warnings[]` |

## Geometry (PI-08)

- **v1 placement:** When PDF text items include x/y, cluster into runs; else **deterministic grid pack** of runs inside derived envelope (documented in PI-04 until PI-08 lands).
- **Rotation:** axis-aligned only v1.

## Security & performance

- **Security:** Same auth as POST `/layouts`; validate run array size cap (e.g. max 500 runs); no arbitrary code from OCR.
- **Performance:** Parsers O(n) on text length; OCR gated by env (NFR-3).
- **Observability:** Log `plan_fixture_import` with `layoutId`, `runCount`, `parserVersion` (PI-10).

## Rollback

Disable `PLAN_FIXTURE_IMPORT_ENABLED`; fixture branch skipped; envelope import unchanged.
