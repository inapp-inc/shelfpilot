# Design: SEED-06b-catalog-seed-verticals

## Stack

Demo: React/Vite · Express · SQLite (`node:sqlite`) · Docker Compose · Mock auth · Three.js · Node >= 22.5.

## Constraints

- Performance: N/A
  - Security: N/A — seed data
  - Observability: N/A
  - Backward compatibility: Additive seed; do not wipe user layouts
  - Cost: N/A

## Risks & rollback

- Risks: Re-seed duplicates — make idempotent.
  - Rollback steps: Empty categories/products tables and re-run minimal seed.

## Decisions

- Prefer additive OpenAPI changes.
- UI SoT: `ui/ShelfPilot.dc.html` when UI is touched.
- Persistence: SQLite via `SQLITE_PATH` only for this SEED.
