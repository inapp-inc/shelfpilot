# Tasks: merch-layers-polygon-fix

Change: `openspec/changes/merch-layers-polygon-fix/`  
Plan SEEDs: `Docs/seeds/SEED-ML-*.md`

## SEED checklist

- [x] SEED-ML-00-product-crud — Add/update product UI + PATCH API + OpenAPI
- [x] SEED-ML-01-polygon-tight-packer — Fix overflow; clip aisles; containment tests on irregular polygon
- [x] SEED-ML-02-canvas-wheel-zoom — 2D mouse-wheel zoom toward cursor
- [x] SEED-ML-03-multilevel-planogram — Per-level product placement; shelf-type level templates
- [x] SEED-ML-04-reuse-doc — `Docs/REUSE_LAYOUT_PLANOGRAM.md` + handover note
- [x] SEED-ML-05-validation — Tests, openapi:check, smoke checklist

## Evidence gates

- [x] OpenAPI v0.5.0 — `PATCH /products/{productId}` (36 ops)
- [x] Autogen on L-shaped polygon: 0 containment violations
- [x] Planogram places products on distinct levels
- [x] Wheel zoom (passive:false listener on canvas stage)
- [x] Reuse doc linked from handover
- [ ] Intent review before merge (manual PRs)

## Status

**Implemented** (demo stack). Approved and delivered through SEED-ML-00…05.  
`npm test` — 25 pass · `openapi:check` PASS.
