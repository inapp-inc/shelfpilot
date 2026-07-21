# Design: SEED-00b-sqlite-docker

## Stack

Demo: React/Vite · Express · SQLite (`node:sqlite`) · Docker Compose · Mock auth · Three.js · Node >= 22.5.

## Constraints

- Performance: N/A — local single-node demo
  - Security: N/A — demo DB file; not multi-tenant
  - Observability: Stdout logs; compose healthcheck on /health
  - Backward compatibility: API contract unchanged
  - Cost: N/A

## Risks & rollback

- Risks: SQLite not suitable for multi-instance prod.
  - Rollback steps: Wipe volume shelfpilot_data or delete SQLITE_PATH file; re-seed.

## Decisions

- Prefer additive OpenAPI changes.
- UI SoT: `ui/ShelfPilot.dc.html` when UI is touched.
- Persistence: SQLite via `SQLITE_PATH` only for this SEED.
