# Design: SEED-00c-openapi-align

## Stack

Demo: React/Vite · Express · SQLite (`node:sqlite`) · Docker Compose · Mock auth · Three.js · Node >= 22.5.

## Constraints

- Performance: N/A — docs only
  - Security: N/A — contract documentation
  - Observability: N/A — no runtime change
  - Backward compatibility: Additive preferred; breaking changes must be called out
  - Cost: N/A

## Risks & rollback

- Risks: UI relies on undocumented fields.
  - Rollback steps: Revert openapi.yaml commit.

## Decisions

- Prefer additive OpenAPI changes.
- UI SoT: `ui/ShelfPilot.dc.html` when UI is touched.
- Persistence: SQLite via `SQLITE_PATH` only for this SEED.
