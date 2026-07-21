---
seedId: SEED-00c-openapi-align
phase: 0
status: Done
stack: demo
---

# SEED-00c-openapi-align

## SEED Unit

- **SEED-ID:** SEED-00c-openapi-align
- **Status:** Done
- **Phase:** 0
- **Goal:** Align Docs/openapi.yaml with every live API route and schema used by the UI.
- **Scope:**
  - In scope:
    - Document all Express routes
    - Sync request/response schemas
    - openapi:check script green
  - Out of scope:
    - New business features
    - Breaking URL renames without version note
- **Constraints:**
  - Performance: N/A — docs only
  - Security: N/A — contract documentation
  - Observability: N/A — no runtime change
  - Backward compatibility: Additive preferred; breaking changes must be called out
  - Cost: N/A
- **Stack note:** Demo stack locked: React/Vite · Express · SQLite (node:sqlite) · Docker Compose · Mock auth · Three.js. Node >= 22.5.
- **Acceptance criteria:**
  1. Given codebase/api routes, When comparing to Docs/openapi.yaml, Then every path+method is documented.
  2. Given npm run openapi:check, When executed, Then exit code 0.
- **Evidence required:**
  - openapi:check output
  - Docs/openapi.yaml diff
  - OpenAPI / contract (`Docs/openapi.yaml`) if APIs touched
- **Risks & rollback:**
  - Risks: UI relies on undocumented fields.
  - Rollback steps: Revert openapi.yaml commit.
- **Spec link:** `openspec/changes/SEED-00c-openapi-align/` (unit: `Docs/seeds/SEED-00c-openapi-align.md`)
- **Engineering skills invoked:** none

## PR checklist (manual)

- [ ] OpenAPI updated before API shape changes
- [ ] Tests/evidence attached
- [ ] UI checked against `ui/ShelfPilot.dc.html` when UI touched
- [ ] Intent review before merge
