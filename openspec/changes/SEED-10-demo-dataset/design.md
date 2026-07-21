# Design: SEED-10-demo-dataset

## Stack

Demo: React/Vite · Express · SQLite (`node:sqlite`) · Docker Compose · Mock auth · Three.js · Node >= 22.5.

## Constraints

- Performance: N/A
  - Security: N/A — local demo data
  - Observability: N/A
  - Backward compatibility: Idempotent seed preferred
  - Cost: N/A

## Risks & rollback

- Risks: Overwrites — document destructive flag.
  - Rollback steps: Delete SQLITE_PATH / volume; re-seed minimal users only.

## Decisions

- Prefer additive OpenAPI changes.
- UI SoT: `ui/ShelfPilot.dc.html` when UI is touched.
- Persistence: SQLite via `SQLITE_PATH` only for this SEED.
