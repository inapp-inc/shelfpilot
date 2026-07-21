# Design: SEED-08-analytics

## Stack

Demo: React/Vite · Express · SQLite (`node:sqlite`) · Docker Compose · Mock auth · Three.js · Node >= 22.5.

## Constraints

- Performance: N/A — small layouts
  - Security: N/A — auth required
  - Observability: Log analytics_summary durationMs
  - Backward compatibility: Summary schema stable
  - Cost: N/A

## Risks & rollback

- Risks: Division by zero on zero footprint — guard.
  - Rollback steps: Revert analytics route formula.

## Decisions

- Prefer additive OpenAPI changes.
- UI SoT: `ui/ShelfPilot.dc.html` when UI is touched.
- Persistence: SQLite via `SQLITE_PATH` only for this SEED.
