# Design: SEED-03-dashboard-projects

## Stack

Demo: React/Vite · Express · SQLite (`node:sqlite`) · Docker Compose · Mock auth · Three.js · Node >= 22.5.

## Constraints

- Performance: N/A — small demo datasets
  - Security: N/A — auth already applied
  - Observability: N/A — CRUD UI
  - Backward compatibility: Layout list API stable
  - Cost: N/A

## Risks & rollback

- Risks: Card missing dims if API summary lacks width/depth.
  - Rollback steps: Revert web Dashboard components.

## Decisions

- Prefer additive OpenAPI changes.
- UI SoT: `ui/ShelfPilot.dc.html` when UI is touched.
- Persistence: SQLite via `SQLITE_PATH` only for this SEED.
