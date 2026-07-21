# Design: SEED-11-compose-demo-pack

## Stack

Demo: React/Vite · Express · SQLite (`node:sqlite`) · Docker Compose · Mock auth · Three.js · Node >= 22.5.

## Constraints

- Performance: N/A
  - Security: N/A — local
  - Observability: Compose healthcheck
  - Backward compatibility: N/A
  - Cost: N/A

## Risks & rollback

- Risks: Port conflicts 3000/8080.
  - Rollback steps: docker compose down.

## Decisions

- Prefer additive OpenAPI changes.
- UI SoT: `ui/ShelfPilot.dc.html` when UI is touched.
- Persistence: SQLite via `SQLITE_PATH` only for this SEED.
