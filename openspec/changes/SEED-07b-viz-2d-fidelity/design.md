# Design: SEED-07b-viz-2d-fidelity

## Stack

Demo: React/Vite · Express · SQLite (`node:sqlite`) · Docker Compose · Mock auth · Three.js · Node >= 22.5.

## Constraints

- Performance: N/A — CSS/layout
  - Security: N/A
  - Observability: N/A
  - Backward compatibility: N/A — visual only
  - Cost: N/A

## Risks & rollback

- Risks: Drift from DC file if both edited — UI SoT wins.
  - Rollback steps: Revert web CSS/editor styles.

## Decisions

- Prefer additive OpenAPI changes.
- UI SoT: `ui/ShelfPilot.dc.html` when UI is touched.
- Persistence: SQLite via `SQLITE_PATH` only for this SEED.
