---
seedId: SEED-02b-user-admin-crud
phase: 1
status: Done
stack: demo
---

# SEED-02b-user-admin-crud

## SEED Unit

- **SEED-ID:** SEED-02b-user-admin-crud
- **Status:** Done
- **Phase:** 1
- **Goal:** Admin can create/update demo users in SQLite (mock passwords).
- **Scope:**
  - In scope:
    - POST/PATCH /admin/users
    - List users
    - New user can login
  - Out of scope:
    - Password hashing beyond demo
    - Email verification
- **Constraints:**
  - Performance: N/A
  - Security: Admin-only; document demo-only plaintext passwords
  - Observability: Audit user create/update
  - Backward compatibility: Seed users unchanged
  - Cost: N/A
- **Stack note:** Demo stack locked: React/Vite · Express · SQLite (node:sqlite) · Docker Compose · Mock auth · Three.js. Node >= 22.5.
- **Acceptance criteria:**
  1. Given Admin, When creating a user with role Designer, Then user appears in GET /admin/users.
  2. Given the new user credentials, When login, Then token issued.
  3. Given Designer, When POST /admin/users, Then 403.
- **Evidence required:**
  - API tests
  - OpenAPI admin user schemas
  - OpenAPI / contract (`Docs/openapi.yaml`) if APIs touched
- **Risks & rollback:**
  - Risks: Demo password storage.
  - Rollback steps: Delete created users from SQLite; revert routes.
- **Spec link:** `openspec/changes/SEED-02b-user-admin-crud/` (unit: `Docs/seeds/SEED-02b-user-admin-crud.md`)
- **Engineering skills invoked:** security-engineering

## PR checklist (manual)

- [ ] OpenAPI updated before API shape changes
- [ ] Tests/evidence attached
- [ ] UI checked against `ui/ShelfPilot.dc.html` when UI touched
- [ ] Intent review before merge
