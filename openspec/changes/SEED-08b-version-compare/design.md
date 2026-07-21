# Design: SEED-08b-version-compare

## Stack

Demo: React/Vite · Express · SQLite (`node:sqlite`) · Docker Compose · Mock auth · Three.js · Node >= 22.5.

## Constraints

- Performance: N/A
  - Security: N/A — auth required
  - Observability: N/A
  - Backward compatibility: Additive endpoint
  - Cost: N/A

## Risks & rollback

- Risks: Missing layout id → 404.
  - Rollback steps: Hide compare UI; keep summary.

## Decisions

- Prefer additive OpenAPI changes.
- UI SoT: `ui/ShelfPilot.dc.html` when UI is touched.
- Persistence: SQLite via `SQLITE_PATH` only for this SEED.
