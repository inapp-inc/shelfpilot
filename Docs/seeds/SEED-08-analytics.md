---
seedId: SEED-08-analytics
phase: 6
status: Done
stack: demo
---

# SEED-08-analytics

## SEED Unit

- **SEED-ID:** SEED-08-analytics
- **Status:** Done
- **Phase:** 6
- **Goal:** M5 analytics summary: utilization, capacity, allocation-by-category, layout picker.
- **Scope:**
  - In scope:
    - GET analytics summary
    - KPI UI
    - Latency log
  - Out of scope:
    - BI tool export
    - Scheduled reports
- **Constraints:**
  - Performance: N/A — small layouts
  - Security: N/A — auth required
  - Observability: Log analytics_summary durationMs
  - Backward compatibility: Summary schema stable
  - Cost: N/A
- **Stack note:** Demo stack locked: React/Vite · Express · SQLite (node:sqlite) · Docker Compose · Mock auth · Three.js. Node >= 22.5.
- **Acceptance criteria:**
  1. Given mapped layout, When GET summary, Then utilizationPercent and fixtureCount are consistent with geometry.
  2. Given no mappings, When GET summary, Then allocationByCategory is empty array.
- **Evidence required:**
  - Analytics API tests
  - Analytics UI
  - OpenAPI / contract (`Docs/openapi.yaml`) if APIs touched
- **Risks & rollback:**
  - Risks: Division by zero on zero footprint — guard.
  - Rollback steps: Revert analytics route formula.
- **Spec link:** `openspec/changes/SEED-08-analytics/` (unit: `Docs/seeds/SEED-08-analytics.md`)
- **Engineering skills invoked:** observability

## PR checklist (manual)

- [ ] OpenAPI updated before API shape changes
- [ ] Tests/evidence attached
- [ ] UI checked against `ui/ShelfPilot.dc.html` when UI touched
- [ ] Intent review before merge
