# Design: SEED-13-handover-refresh

## Stack

Demo: React/Vite · Express · SQLite (`node:sqlite`) · Docker Compose · Mock auth · Three.js · Node >= 22.5.

## Constraints

- Performance: N/A
  - Security: OWASP table updated for demo scope
  - Observability: N/A
  - Backward compatibility: N/A — docs
  - Cost: N/A

## Risks & rollback

- Risks: Stale links.
  - Rollback steps: Revert docs commit.

## Decisions

- Prefer additive OpenAPI changes.
- UI SoT: `ui/ShelfPilot.dc.html` when UI is touched.
- Persistence: SQLite via `SQLITE_PATH` only for this SEED.
