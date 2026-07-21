# Tasks: layout-autogen-walkthrough

Change: `openspec/changes/layout-autogen-walkthrough/`  
Plan SEEDs: `Docs/seeds/SEED-AG-*.md`

## SEED checklist

- [x] SEED-AG-00-polygon-containment — Draw/edit polygon; strict containment validation API
- [x] SEED-AG-01-rules-packer — `POST .../autogenerate` parallel-row packer
- [x] SEED-AG-02-generate-ui — Draw area tool + Generate dialog + replace confirm
- [x] SEED-AG-03-category-product-filter — Category+children filter; block unmapped planogram
- [x] SEED-AG-04-3d-orbit-controls — Scroll zoom / orbit / pan
- [x] SEED-AG-05-3d-walk-products — Walk mode + products visible on shelves
- [x] SEED-AG-06-validation-handover — Tests, OpenAPI check, handover note

## Evidence gates

- [x] `Docs/openapi.yaml` updated (v0.4.0, autogenerate)
- [x] Packer + containment + category gate tests (`npm test` — 22 pass)
- [x] UI: draw area, Generate, category-filtered planogram, Orbit/Walk 3D
- [ ] Intent review before merge (manual PRs)

## Status

**Implemented** (demo stack). Approved and delivered through SEED-AG-00…06.
