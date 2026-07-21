---
seedId: SEED-06-products-categories
phase: 4
status: Done
stack: demo
---

# SEED-06-products-categories

## SEED Unit

- **SEED-ID:** SEED-06-products-categories
- **Status:** Done
- **Phase:** 4
- **Goal:** M3 hierarchical categories and products per vertical with JSON import/export.
- **Scope:**
  - In scope:
    - Category tree API/UI
    - Product table
    - Import/export JSON
  - Out of scope:
    - ERP sync
    - Real CSV Excel macros
- **Constraints:**
  - Performance: N/A — demo catalog size
  - Security: Auth required; Admin/Designer import
  - Observability: N/A — CRUD
  - Backward compatibility: Category/product ids stable for mappings
  - Cost: N/A
- **Stack note:** Demo stack locked: React/Vite · Express · SQLite (node:sqlite) · Docker Compose · Mock auth · Three.js. Node >= 22.5.
- **Acceptance criteria:**
  1. Given vertical pharmacy, When listing categories, Then tree includes parent/child where seeded.
  2. Given import payload, When POST /catalog/import, Then counts > 0 and data listable.
  3. Given export, When user clicks Export, Then JSON downloads.
- **Evidence required:**
  - Catalog API tests
  - UI Products screen vs UI SoT
  - OpenAPI / contract (`Docs/openapi.yaml`) if APIs touched
- **Risks & rollback:**
  - Risks: Import duplicates — use id upsert or skip.
  - Rollback steps: Delete imported rows; restore seed.
- **Spec link:** `openspec/changes/SEED-06-products-categories/` (unit: `Docs/seeds/SEED-06-products-categories.md`)
- **Engineering skills invoked:** none

## PR checklist (manual)

- [ ] OpenAPI updated before API shape changes
- [ ] Tests/evidence attached
- [ ] UI checked against `ui/ShelfPilot.dc.html` when UI touched
- [ ] Intent review before merge
