# Design: SEED-05b-fixture-drag-snap

## Stack

Demo: React/Vite · Express · SQLite (`node:sqlite`) · Docker Compose · Mock auth · Three.js · Node >= 22.5.

## Constraints

- Performance: UI remains responsive while dragging (no full re-fetch each pixel)
  - Security: N/A — same RBAC as fixture mutate
  - Observability: N/A — client interaction
  - Backward compatibility: x/y fields already on fixture
  - Cost: N/A

## Risks & rollback

- Risks: Excessive PATCH traffic — debounce saves.
  - Rollback steps: Disable drag; keep click-to-place only.

## Decisions

- Prefer additive OpenAPI changes.
- UI SoT: `ui/ShelfPilot.dc.html` when UI is touched.
- Persistence: SQLite via `SQLITE_PATH` only for this SEED.
