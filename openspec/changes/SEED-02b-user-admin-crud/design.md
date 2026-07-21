# Design: SEED-02b-user-admin-crud

## Stack

Demo: React/Vite · Express · SQLite (`node:sqlite`) · Docker Compose · Mock auth · Three.js · Node >= 22.5.

## Constraints

- Performance: N/A
  - Security: Admin-only; document demo-only plaintext passwords
  - Observability: Audit user create/update
  - Backward compatibility: Seed users unchanged
  - Cost: N/A

## Risks & rollback

- Risks: Demo password storage.
  - Rollback steps: Delete created users from SQLite; revert routes.

## Decisions

- Prefer additive OpenAPI changes.
- UI SoT: `ui/ShelfPilot.dc.html` when UI is touched.
- Persistence: SQLite via `SQLITE_PATH` only for this SEED.
