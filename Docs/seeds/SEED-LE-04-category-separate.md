---
seedId: SEED-LE-04-category-separate
phase: LE
status: Done
stack: demo
change: layout-editor-planogram
---

# SEED-LE-04-category-separate

## SEED Unit

- **SEED-ID:** SEED-LE-04-category-separate
- **Status:** Done
- **Goal:** Independent category mapping for aisles vs shelves.
- **Scope:**
  - In scope:
    - CategoryMappingPanel
    - aisleMappings/shelfMappings
    - colors on each
  - Out of scope:
    - SKU category inheritance rules
- **Constraints:**
  - Performance: N/A
  - Security: Designer/Admin; Viewer 403 on map
  - Observability: N/A
  - Backward compatibility: Legacy mappings.fixtureId still accepted
  - Cost: N/A
- **Stack note:** Demo stack: React/Vite · Express · SQLite · Docker Compose · Mock auth · Three.js. Node >= 22.5.
- **Acceptance criteria:**
  1. Given aisle and shelf mapped to different categories, When GET layout, Then each retains its categoryId/color.
  2. Given Viewer, When mapping shelf, Then 403.
- **Evidence required:**
  - API tests
  - UI
  - OpenAPI / contract (`Docs/openapi.yaml`) if APIs touched
- **Risks & rollback:**
  - Risks: Orphan mappings.
  - Rollback steps: Fall back to single mappings array.
- **Spec link:** `openspec/changes/SEED-LE-04-category-separate/` (unit: `Docs/seeds/SEED-LE-04-category-separate.md`; parent change: `openspec/changes/layout-editor-planogram/`)
- **Engineering skills invoked:** security-engineering

## PR checklist (manual)

- [ ] OpenAPI updated before API shape changes
- [ ] Tests/evidence attached
- [ ] UI modular editor checked when UI touched
- [ ] Intent review before merge
