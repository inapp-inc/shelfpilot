---
seedId: SEED-06b-catalog-seed-verticals
phase: 4
status: Done
stack: demo
---

# SEED-06b-catalog-seed-verticals

## SEED Unit

- **SEED-ID:** SEED-06b-catalog-seed-verticals
- **Status:** Done
- **Phase:** 4
- **Goal:** Rich demo catalog seed for Retail, Pharmacy, Beauty, Apparel from UI SoT data.
- **Scope:**
  - In scope:
    - Seed script npm run seed:demo-catalog
    - VERTICALS/PRODUCTS parity
  - Out of scope:
    - Customer-specific catalogs
- **Constraints:**
  - Performance: N/A
  - Security: N/A — seed data
  - Observability: N/A
  - Backward compatibility: Additive seed; do not wipe user layouts
  - Cost: N/A
- **Stack note:** Demo stack locked: React/Vite · Express · SQLite (node:sqlite) · Docker Compose · Mock auth · Three.js. Node >= 22.5.
- **Acceptance criteria:**
  1. Given fresh or seeded DB, When switching each vertical, Then category tree is non-empty.
  2. Given each vertical, When listing products, Then at least 3 products exist.
- **Evidence required:**
  - seed script
  - UI smoke
  - OpenAPI / contract (`Docs/openapi.yaml`) if APIs touched
- **Risks & rollback:**
  - Risks: Re-seed duplicates — make idempotent.
  - Rollback steps: Empty categories/products tables and re-run minimal seed.
- **Spec link:** `openspec/changes/SEED-06b-catalog-seed-verticals/` (unit: `Docs/seeds/SEED-06b-catalog-seed-verticals.md`)
- **Engineering skills invoked:** none

## PR checklist (manual)

- [ ] OpenAPI updated before API shape changes
- [ ] Tests/evidence attached
- [ ] UI checked against `ui/ShelfPilot.dc.html` when UI touched
- [ ] Intent review before merge
