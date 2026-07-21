# Design: SEED-01b-auth-session-hardening

## Stack

Demo: React/Vite · Express · SQLite (`node:sqlite`) · Docker Compose · Mock auth · Three.js · Node >= 22.5.

## Constraints

- Performance: N/A — session table lookups
  - Security: Session expiry and revoke; still mock passwords
  - Observability: Audit logout
  - Backward compatibility: Existing tokens may invalidate when TTL enabled
  - Cost: N/A

## Risks & rollback

- Risks: Breaking open demos if TTL too short.
  - Rollback steps: Set AUTH_SESSION_TTL=0 or remove expiry check via config.

## Decisions

- Prefer additive OpenAPI changes.
- UI SoT: `ui/ShelfPilot.dc.html` when UI is touched.
- Persistence: SQLite via `SQLITE_PATH` only for this SEED.
