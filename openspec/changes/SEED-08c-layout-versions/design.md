# Design: SEED-08c-layout-versions

## Stack

Demo: React/Vite · Express · SQLite (`node:sqlite`) · Docker Compose · Mock auth · Three.js · Node >= 22.5.

## Constraints

- Performance: N/A — few snapshots
  - Security: N/A — same layout RBAC
  - Observability: Audit snapshot create
  - Backward compatibility: Flag default on for demo
  - Cost: N/A

## Risks & rollback

- Risks: DB growth — limit snapshots per layout in demo.
  - Rollback steps: LAYOUT_VERSIONING=0; ignore versions table.

## Decisions

- Prefer additive OpenAPI changes.
- UI SoT: `ui/ShelfPilot.dc.html` when UI is touched.
- Persistence: SQLite via `SQLITE_PATH` only for this SEED.
