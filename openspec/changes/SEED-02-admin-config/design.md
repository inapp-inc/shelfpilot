# Design: SEED-02-admin-config

## Stack

Demo: React/Vite · Express · SQLite (`node:sqlite`) · Docker Compose · Mock auth · Three.js · Node >= 22.5.

## Constraints

- Performance: N/A — config CRUD
  - Security: Admin-only writes; Designer 403 on PUT config
  - Observability: Audit on config PUT and layout status changes
  - Backward compatibility: Existing config keys preserved
  - Cost: N/A

## Risks & rollback

- Risks: Toggle off may block demo approval flow.
  - Rollback steps: Set approvalWorkflowEnabled true in config; revert UI tab changes.

## Decisions

- Prefer additive OpenAPI changes.
- UI SoT: `ui/ShelfPilot.dc.html` when UI is touched.
- Persistence: SQLite via `SQLITE_PATH` only for this SEED.
