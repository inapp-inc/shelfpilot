---
seedId: SEED-03-dashboard-projects
phase: 2
status: Done
stack: demo
---

# SEED-03-dashboard-projects

## SEED Unit

- **SEED-ID:** SEED-03-dashboard-projects
- **Status:** Done
- **Phase:** 2
- **Goal:** Dashboard portfolio parity with UI SoT: filters, cards, empty state, wizard entry.
- **Scope:**
  - In scope:
    - Status filters
    - Project cards with dims
    - 3-step new layout wizard
    - Empty state
  - Out of scope:
    - Advanced search
    - Pagination at scale
- **Constraints:**
  - Performance: N/A — small demo datasets
  - Security: N/A — auth already applied
  - Observability: N/A — CRUD UI
  - Backward compatibility: Layout list API stable
  - Cost: N/A
- **Stack note:** Demo stack locked: React/Vite · Express · SQLite (node:sqlite) · Docker Compose · Mock auth · Three.js. Node >= 22.5.
- **Acceptance criteria:**
  1. Given layouts with mixed statuses, When filtering draft, Then only drafts show.
  2. Given Designer, When completing wizard with dimensions, Then draft layout is created and editor opens.
  3. Given no matching filter, When dashboard loads, Then empty state is shown.
- **Evidence required:**
  - Layout list/create API tests
  - UI SoT checklist Dashboard
  - OpenAPI / contract (`Docs/openapi.yaml`) if APIs touched
- **Risks & rollback:**
  - Risks: Card missing dims if API summary lacks width/depth.
  - Rollback steps: Revert web Dashboard components.
- **Spec link:** `openspec/changes/SEED-03-dashboard-projects/` (unit: `Docs/seeds/SEED-03-dashboard-projects.md`)
- **Engineering skills invoked:** none

## PR checklist (manual)

- [ ] OpenAPI updated before API shape changes
- [ ] Tests/evidence attached
- [ ] UI checked against `ui/ShelfPilot.dc.html` when UI touched
- [ ] Intent review before merge
