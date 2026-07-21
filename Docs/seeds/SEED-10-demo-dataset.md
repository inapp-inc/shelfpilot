---
seedId: SEED-10-demo-dataset
phase: 7
status: Done
stack: demo
---

# SEED-10-demo-dataset

## SEED Unit

- **SEED-ID:** SEED-10-demo-dataset
- **Status:** Done
- **Phase:** 7
- **Goal:** One-command demo dataset: 3 projects with fixtures, aisles, mappings.
- **Scope:**
  - In scope:
    - npm run seed:demo
    - Pharmacy in_review, Apparel draft, Retail approved
  - Out of scope:
    - Customer data import
- **Constraints:**
  - Performance: N/A
  - Security: N/A — local demo data
  - Observability: N/A
  - Backward compatibility: Idempotent seed preferred
  - Cost: N/A
- **Stack note:** Demo stack locked: React/Vite · Express · SQLite (node:sqlite) · Docker Compose · Mock auth · Three.js. Node >= 22.5.
- **Acceptance criteria:**
  1. Given empty or reset DB, When npm run seed:demo, Then dashboard shows 3 layout cards.
  2. Given pharmacy demo layout, When opened, Then fixtures and at least one mapping exist.
- **Evidence required:**
  - seed script
  - README snippet
  - OpenAPI / contract (`Docs/openapi.yaml`) if APIs touched
- **Risks & rollback:**
  - Risks: Overwrites — document destructive flag.
  - Rollback steps: Delete SQLITE_PATH / volume; re-seed minimal users only.
- **Spec link:** `openspec/changes/SEED-10-demo-dataset/` (unit: `Docs/seeds/SEED-10-demo-dataset.md`)
- **Engineering skills invoked:** none

## PR checklist (manual)

- [ ] OpenAPI updated before API shape changes
- [ ] Tests/evidence attached
- [ ] UI checked against `ui/ShelfPilot.dc.html` when UI touched
- [ ] Intent review before merge
