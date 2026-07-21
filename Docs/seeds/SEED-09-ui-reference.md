---
seedId: SEED-09-ui-reference
phase: 7
status: Done
stack: demo
---

# SEED-09-ui-reference

## SEED Unit

- **SEED-ID:** SEED-09-ui-reference
- **Status:** Done
- **Phase:** 7
- **Goal:** Close remaining UI SoT gaps: toasts, approve/reject, empty/loading states.
- **Scope:**
  - In scope:
    - Toast stack
    - Approver actions
    - Empty/loading
    - VALIDATION_UI_REFERENCE complete
  - Out of scope:
    - New product features
- **Constraints:**
  - Performance: N/A
  - Security: N/A
  - Observability: N/A
  - Backward compatibility: N/A — UI polish
  - Cost: N/A
- **Stack note:** Demo stack locked: React/Vite · Express · SQLite (node:sqlite) · Docker Compose · Mock auth · Three.js. Node >= 22.5.
- **Acceptance criteria:**
  1. Given Docs/VALIDATION_UI_REFERENCE.md, When reviewed, Then all critical rows are Match.
- **Evidence required:**
  - VALIDATION_UI_REFERENCE.md sign-off
  - OpenAPI / contract (`Docs/openapi.yaml`) if APIs touched
- **Risks & rollback:**
  - Risks: SoT file edits without React port.
  - Rollback steps: Revert web UI commits.
- **Spec link:** `openspec/changes/SEED-09-ui-reference/` (unit: `Docs/seeds/SEED-09-ui-reference.md`)
- **Engineering skills invoked:** none

## PR checklist (manual)

- [ ] OpenAPI updated before API shape changes
- [ ] Tests/evidence attached
- [ ] UI checked against `ui/ShelfPilot.dc.html` when UI touched
- [ ] Intent review before merge
