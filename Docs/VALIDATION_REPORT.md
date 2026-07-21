# Validation Report — ShelfPilot UI + Mock API

**Date:** 2026-07-15  
**Seed scope:** SEED-00 … SEED-13 + SEED-LE + SEED-AG + SEED-ML + SEED-DR  
**Contract:** `Docs/openapi.yaml` (v0.5.0)

## Commands

```bash
cd codebase
npm install
npm test
npm run openapi:check
```

## Results

`npm test` → **25 passed, 0 failed** (2026-07-15).

`npm run openapi:check` → **36 OpenAPI operations verified**.

| Check | Status |
|-------|--------|
| GET /health | Pass (automated) |
| Login + Viewer 403 on layout create | Pass (automated) |
| Create layout + aisle min-width violation | Pass (automated) |
| Dimension change recalculates autoCalc | Pass (automated) |
| Fixture + category mapping | Pass (automated) |
| Analytics summary | Pass (automated) |
| Pharmacy vs apparel config differ | Pass (automated) |
| Polygon containment rejection | Pass (automated) |
| Rules autogenerate inside polygon | Pass (automated) |
| Category-gated planogram | Pass (automated) |
| Product create + PATCH update | Pass (automated) |
| Multi-level planogram per shelf | Pass (automated) |
| OpenAPI file present (36 ops) | Pass |
| SQLite durable persistence | Pass |
| UI screens (Login→Admin) | Implemented in `codebase/web` — manual smoke recommended |

## Prototype AC (project.md §8)

| AC | Evidence |
|----|----------|
| Dimensions → scaled canvas | Wizard + Layout Editor floor plan |
| Custom shelf / aisle | POST shelves/aisles + UI palette |
| Aisle min-width flag | validation.aisleViolations |
| Auto-calc on dimension change | PATCH layout updates autoCalc |
| Color-coded mapping | shelfMappings + shelf.color |
| Polygon draw + strict containment | Draw area tool + containment_violation API |
| Rules autogenerate | POST /autogenerate + packer tests |
| Category-gated planogram | shelf_category_required + filter |
| Multi-level planogram | levelIndex placements per shelf |
| Product CRUD | POST + PATCH /products |
| 2D wheel-zoom + 3D Orbit/Walk | LayoutEditor + Scene3D |
| Analytics utilization/allocation | /analytics/.../summary |
| Pharmacy vs apparel via config | /admin/config?vertical= |

## Gaps / follow-ups

- Manual UI browser smoke after `npm run dev:api` + `npm run dev:web`
- BRD/FRD source files still deferred (A-S3)
- Mongo persistence deferred (A-D2)
