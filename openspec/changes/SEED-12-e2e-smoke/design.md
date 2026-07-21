# Design: SEED-12-e2e-smoke

## Stack

Demo: React/Vite · Express · SQLite (`node:sqlite`) · Docker Compose · Mock auth · Three.js · Node >= 22.5.

## Constraints

- Performance: N/A
  - Security: N/A — uses demo users
  - Observability: N/A
  - Backward compatibility: N/A
  - Cost: N/A

## Risks & rollback

- Risks: Flaky if depending on UI timing — prefer API smoke first.
  - Rollback steps: Remove script from required gates.

## Decisions

- Prefer additive OpenAPI changes.
- UI SoT: `ui/ShelfPilot.dc.html` when UI is touched.
- Persistence: SQLite via `SQLITE_PATH` only for this SEED.
