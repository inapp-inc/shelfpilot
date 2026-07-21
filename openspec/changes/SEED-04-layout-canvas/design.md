# Design: SEED-04-layout-canvas

## Stack

Demo: React/Vite · Express · SQLite (`node:sqlite`) · Docker Compose · Mock auth · Three.js · Node >= 22.5.

## Constraints

- Performance: N/A — 2D canvas MVP
  - Security: Designer/Admin mutate; Viewer read-only
  - Observability: N/A — client canvas
  - Backward compatibility: Layout payload fields additive
  - Cost: N/A

## Risks & rollback

- Risks: Validation rules differ per vertical — must read config.
  - Rollback steps: Revert editor canvas components; keep API validation.

## Decisions

- Prefer additive OpenAPI changes.
- UI SoT: `ui/ShelfPilot.dc.html` when UI is touched.
- Persistence: SQLite via `SQLITE_PATH` only for this SEED.
