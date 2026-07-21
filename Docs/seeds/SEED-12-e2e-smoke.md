---
seedId: SEED-12-e2e-smoke
phase: 7
status: Done
stack: demo
---

# SEED-12-e2e-smoke

## SEED Unit

- **SEED-ID:** SEED-12-e2e-smoke
- **Status:** Done
- **Phase:** 7
- **Goal:** Automated happy-path smoke: login → create → fixture → aisle → map → analytics.
- **Scope:**
  - In scope:
    - API-level or Playwright smoke command
    - CI-ready script
  - Out of scope:
    - Full visual regression
- **Constraints:**
  - Performance: N/A
  - Security: N/A — uses demo users
  - Observability: N/A
  - Backward compatibility: N/A
  - Cost: N/A
- **Stack note:** Demo stack locked: React/Vite · Express · SQLite (node:sqlite) · Docker Compose · Mock auth · Three.js. Node >= 22.5.
- **Acceptance criteria:**
  1. Given API running, When smoke command executes, Then exit 0.
  2. Given broken mapping route, When smoke runs, Then exit non-zero.
- **Evidence required:**
  - Test report / command output
  - OpenAPI / contract (`Docs/openapi.yaml`) if APIs touched
- **Risks & rollback:**
  - Risks: Flaky if depending on UI timing — prefer API smoke first.
  - Rollback steps: Remove script from required gates.
- **Spec link:** `openspec/changes/SEED-12-e2e-smoke/` (unit: `Docs/seeds/SEED-12-e2e-smoke.md`)
- **Engineering skills invoked:** testing

## PR checklist (manual)

- [ ] OpenAPI updated before API shape changes
- [ ] Tests/evidence attached
- [ ] UI checked against `ui/ShelfPilot.dc.html` when UI touched
- [ ] Intent review before merge
