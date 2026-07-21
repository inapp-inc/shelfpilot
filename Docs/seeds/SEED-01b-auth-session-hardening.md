---
seedId: SEED-01b-auth-session-hardening
phase: 1
status: Done
stack: demo
---

# SEED-01b-auth-session-hardening

## SEED Unit

- **SEED-ID:** SEED-01b-auth-session-hardening
- **Status:** Done
- **Phase:** 1
- **Goal:** Demo-safe session lifecycle on SQLite (expiry + logout).
- **Scope:**
  - In scope:
    - Token TTL
    - POST /auth/logout
    - 401 on expired/revoked token
    - Audit login/logout
  - Out of scope:
    - Real IdP
    - Refresh-token rotation
- **Constraints:**
  - Performance: N/A — session table lookups
  - Security: Session expiry and revoke; still mock passwords
  - Observability: Audit logout
  - Backward compatibility: Existing tokens may invalidate when TTL enabled
  - Cost: N/A
- **Stack note:** Demo stack locked: React/Vite · Express · SQLite (node:sqlite) · Docker Compose · Mock auth · Three.js. Node >= 22.5.
- **Acceptance criteria:**
  1. Given an expired token, When calling a protected endpoint, Then 401.
  2. Given logout, When the same token is reused, Then 401.
  3. Given AUTH_SESSION_TTL unset or 0, When login, Then long-lived demo session still works.
- **Evidence required:**
  - New API tests for expiry/logout
  - Docs/openapi.yaml auth paths
  - OpenAPI / contract (`Docs/openapi.yaml`) if APIs touched
- **Risks & rollback:**
  - Risks: Breaking open demos if TTL too short.
  - Rollback steps: Set AUTH_SESSION_TTL=0 or remove expiry check via config.
- **Spec link:** `openspec/changes/SEED-01b-auth-session-hardening/` (unit: `Docs/seeds/SEED-01b-auth-session-hardening.md`)
- **Engineering skills invoked:** security-engineering, rollback-and-flags

## PR checklist (manual)

- [ ] OpenAPI updated before API shape changes
- [ ] Tests/evidence attached
- [ ] UI checked against `ui/ShelfPilot.dc.html` when UI touched
- [ ] Intent review before merge
