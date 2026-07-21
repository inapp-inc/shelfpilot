# Design: SEED-07c-viz-3d

## Stack

Demo: React/Vite · Express · SQLite (`node:sqlite`) · Docker Compose · Mock auth · Three.js · Node >= 22.5.

## Constraints

- Performance: Interactive on integrated GPU; no specialized GPU required
  - Security: N/A
  - Observability: N/A — client render
  - Backward compatibility: N/A
  - Cost: N/A

## Risks & rollback

- Risks: WebGL unavailable — show fallback message.
  - Rollback steps: Hide 3D toggle; keep 2D only.

## Decisions

- Prefer additive OpenAPI changes.
- UI SoT: `ui/ShelfPilot.dc.html` when UI is touched.
- Persistence: SQLite via `SQLITE_PATH` only for this SEED.
