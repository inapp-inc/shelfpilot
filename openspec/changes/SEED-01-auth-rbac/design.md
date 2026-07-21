# Design: SEED-01-auth-rbac

## Stack

Demo: React/Vite · Express · SQLite (`node:sqlite`) · Docker Compose · Mock auth · Three.js · Node >= 22.5.

## Constraints

- Performance: N/A — auth only
  - Security: Mock credentials; never log passwords; RBAC on routes
  - Observability: Audit login events
  - Backward compatibility: N/A — greenfield auth
  - Cost: N/A

## Risks & rollback

- Risks: Mock auth must not ship to production.
  - Rollback steps: Disable protected routes behind flag (demo only).

## Decisions

- Prefer additive OpenAPI changes.
- UI SoT: `ui/ShelfPilot.dc.html` when UI is touched.
- Persistence: SQLite via `SQLITE_PATH` only for this SEED.
