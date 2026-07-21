# Design: SEED-00-bootstrap

## Stack

Demo: React/Vite · Express · SQLite (`node:sqlite`) · Docker Compose · Mock auth · Three.js · Node >= 22.5.

## Constraints

- Performance: N/A — bootstrap
  - Security: N/A — no auth yet
  - Observability: Correlation-id middleware from scaffold
  - Backward compatibility: N/A — greenfield
  - Cost: N/A

## Risks & rollback

- Risks: Scaffold drift from platform starter.
  - Rollback steps: Delete codebase/ and re-run clone-scaffold.

## Decisions

- Prefer additive OpenAPI changes.
- UI SoT: `ui/ShelfPilot.dc.html` when UI is touched.
- Persistence: SQLite via `SQLITE_PATH` only for this SEED.
