---
seedId: SEED-00-bootstrap
phase: 0
status: Done
stack: demo
---

# SEED-00-bootstrap

## SEED Unit

- **SEED-ID:** SEED-00-bootstrap
- **Status:** Done
- **Phase:** 0
- **Goal:** Scaffold ShelfPilot codebase with health API and project layout.
- **Scope:**
  - In scope:
    - Scaffold clone into codebase/
    - Health endpoint
    - Docs/openapi.yaml stub
    - Package naming
  - Out of scope:
    - Domain features
    - Auth
    - UI screens
- **Constraints:**
  - Performance: N/A — bootstrap
  - Security: N/A — no auth yet
  - Observability: Correlation-id middleware from scaffold
  - Backward compatibility: N/A — greenfield
  - Cost: N/A
- **Stack note:** Demo stack locked: React/Vite · Express · SQLite (node:sqlite) · Docker Compose · Mock auth · Three.js. Node >= 22.5.
- **Acceptance criteria:**
  1. Given the API is running, When GET /health, Then response is 200 with ok true and correlationId.
  2. Given the repo, When inspecting Docs/, Then openapi.yaml exists.
- **Evidence required:**
  - codebase/api/test/health.test.js
  - Docs/openapi.yaml
  - OpenAPI / contract (`Docs/openapi.yaml`) if APIs touched
- **Risks & rollback:**
  - Risks: Scaffold drift from platform starter.
  - Rollback steps: Delete codebase/ and re-run clone-scaffold.
- **Spec link:** `openspec/changes/SEED-00-bootstrap/` (unit: `Docs/seeds/SEED-00-bootstrap.md`)
- **Engineering skills invoked:** scaffold

## PR checklist (manual)

- [ ] OpenAPI updated before API shape changes
- [ ] Tests/evidence attached
- [ ] UI checked against `ui/ShelfPilot.dc.html` when UI touched
- [ ] Intent review before merge
