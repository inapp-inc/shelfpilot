# Design: SEED-05-fixtures-autocalc

## Stack

Demo: React/Vite · Express · SQLite (`node:sqlite`) · Docker Compose · Mock auth · Three.js · Node >= 22.5.

## Constraints

- Performance: Auto-calc p95 < 50ms for demo footprints
  - Security: Designer/Admin only mutations
  - Observability: Log auto_calc durationMs
  - Backward compatibility: Existing fixture schema preserved
  - Cost: N/A

## Risks & rollback

- Risks: Template missing for vertical — fall back to defaults.
  - Rollback steps: Revert layoutMath formula; keep prior fixtures in DB.

## Decisions

- Prefer additive OpenAPI changes.
- UI SoT: `ui/ShelfPilot.dc.html` when UI is touched.
- Persistence: SQLite via `SQLITE_PATH` only for this SEED.
