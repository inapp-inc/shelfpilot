---
seedId: SEED-02-admin-config
phase: 1
status: Done
stack: demo
---

# SEED-02-admin-config

## SEED Unit

- **SEED-ID:** SEED-02-admin-config
- **Status:** Done
- **Phase:** 1
- **Goal:** Full Admin & Config (M6) wired to SQLite: users tab, store master, approval, configuration, audit.
- **Scope:**
  - In scope:
    - Admin UI tabs matching UI SoT
    - PUT/GET config
    - Approval workflow toggle gating status
    - Audit list
  - Out of scope:
    - Enterprise IdP user sync
- **Constraints:**
  - Performance: N/A — config CRUD
  - Security: Admin-only writes; Designer 403 on PUT config
  - Observability: Audit on config PUT and layout status changes
  - Backward compatibility: Existing config keys preserved
  - Cost: N/A
- **Stack note:** Demo stack locked: React/Vite · Express · SQLite (node:sqlite) · Docker Compose · Mock auth · Three.js. Node >= 22.5.
- **Acceptance criteria:**
  1. Given Admin, When PUT config for pharmacy, Then GET returns pharmacy rules.
  2. Given Designer, When PUT config, Then 403.
  3. Given pharmacy vs apparel, When GET config, Then minAisleWidthMeters differs.
  4. Given approvalWorkflowEnabled true, When Viewer tries approve, Then 403; Approver can approve.
- **Evidence required:**
  - Admin API tests
  - UI checklist vs ui/ShelfPilot.dc.html Admin
  - OpenAPI / contract (`Docs/openapi.yaml`) if APIs touched
- **Risks & rollback:**
  - Risks: Toggle off may block demo approval flow.
  - Rollback steps: Set approvalWorkflowEnabled true in config; revert UI tab changes.
- **Spec link:** `openspec/changes/SEED-02-admin-config/` (unit: `Docs/seeds/SEED-02-admin-config.md`)
- **Engineering skills invoked:** security-engineering, rollback-and-flags

## PR checklist (manual)

- [ ] OpenAPI updated before API shape changes
- [ ] Tests/evidence attached
- [ ] UI checked against `ui/ShelfPilot.dc.html` when UI touched
- [ ] Intent review before merge
