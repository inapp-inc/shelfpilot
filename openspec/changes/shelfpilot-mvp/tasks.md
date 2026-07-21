# Tasks: shelfpilot-mvp (full demo build)

Master plan: `Docs/SEED_PLAN_FULL.md`  
Units: `Docs/seeds/` · OpenSpec: `openspec/changes/SEED-*/`  
Stack: SQLite · mock auth · Docker Compose · React/Express (demo)

## Phase 0
- [x] SEED-00-bootstrap
- [x] SEED-00b-sqlite-docker
- [x] SEED-00c-openapi-align

## Phase 1
- [x] SEED-01-auth-rbac (core)
- [x] SEED-01b-auth-session-hardening
- [x] SEED-02-admin-config (full UI + gates)
- [x] SEED-02b-user-admin-crud

## Phase 2
- [x] SEED-03-dashboard-projects
- [x] SEED-04-layout-canvas
- [x] SEED-04b-zones-polygon

## Phase 3
- [x] SEED-05-fixtures-autocalc
- [x] SEED-05b-fixture-drag-snap

## Phase 4
- [x] SEED-06-products-categories
- [x] SEED-06b-catalog-seed-verticals
- [x] SEED-07a-category-mapping

## Phase 5
- [x] SEED-07b-viz-2d-fidelity
- [x] SEED-07c-viz-3d

## Phase 6
- [x] SEED-08-analytics
- [x] SEED-08b-version-compare
- [x] SEED-08c-layout-versions

## Phase 7
- [x] SEED-09-ui-reference
- [x] SEED-10-demo-dataset
- [x] SEED-11-compose-demo-pack
- [x] SEED-12-e2e-smoke
- [x] SEED-13-handover-refresh

## Evidence (2026-07-15)

- `npm test` — 10 passed
- `npm run openapi:check` — 28 operations verified
- `npm run seed:demo` — 3 layouts + catalog
- Scripts: `smoke:demo`, Docker compose documented in `codebase/README.md`

## Follow-on (not started — awaiting change approval)

See `openspec/changes/layout-editor-planogram/tasks.md` for SEED-LE-00…07.
