---
seedId: SEED-01-auth-rbac
phase: 1
status: Done
stack: demo
---

# SEED-01-auth-rbac

## SEED Unit

- **SEED-ID:** SEED-01-auth-rbac
- **Status:** Done
- **Phase:** 1
- **Goal:** Mock email/password login with role selection and bearer-token RBAC.
- **Scope:**
  - In scope:
    - POST /auth/login
    - GET /auth/me
    - Role guards on mutations
    - Login UI
  - Out of scope:
    - OIDC/IdP
    - Password hashing beyond demo
- **Constraints:**
  - Performance: N/A — auth only
  - Security: Mock credentials; never log passwords; RBAC on routes
  - Observability: Audit login events
  - Backward compatibility: N/A — greenfield auth
  - Cost: N/A
- **Stack note:** Demo stack locked: React/Vite · Express · SQLite (node:sqlite) · Docker Compose · Mock auth · Three.js. Node >= 22.5.
- **Acceptance criteria:**
  1. Given valid email/password/role, When login, Then token and user are returned.
  2. Given Viewer token, When POST /layouts, Then 403.
- **Evidence required:**
  - codebase/api/test/shelfpilot.test.js
  - OpenAPI / contract (`Docs/openapi.yaml`) if APIs touched
- **Risks & rollback:**
  - Risks: Mock auth must not ship to production.
  - Rollback steps: Disable protected routes behind flag (demo only).
- **Spec link:** `openspec/changes/SEED-01-auth-rbac/` (unit: `Docs/seeds/SEED-01-auth-rbac.md`)
- **Engineering skills invoked:** security-engineering

## PR checklist (manual)

- [ ] OpenAPI updated before API shape changes
- [ ] Tests/evidence attached
- [ ] UI checked against `ui/ShelfPilot.dc.html` when UI touched
- [ ] Intent review before merge
