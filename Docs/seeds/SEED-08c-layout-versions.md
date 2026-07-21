---
seedId: SEED-08c-layout-versions
phase: 6
status: Done
stack: demo
---

# SEED-08c-layout-versions

## SEED Unit

- **SEED-ID:** SEED-08c-layout-versions
- **Status:** Done
- **Phase:** 6
- **Goal:** Demo layout versioning: snapshot on submit-for-review; list versions for compare.
- **Scope:**
  - In scope:
    - versions table or JSON snapshots
    - List versions API
    - Flag LAYOUT_VERSIONING
  - Out of scope:
    - Full git-like history UI
    - Branching
- **Constraints:**
  - Performance: N/A — few snapshots
  - Security: N/A — same layout RBAC
  - Observability: Audit snapshot create
  - Backward compatibility: Flag default on for demo
  - Cost: N/A
- **Stack note:** Demo stack locked: React/Vite · Express · SQLite (node:sqlite) · Docker Compose · Mock auth · Three.js. Node >= 22.5.
- **Acceptance criteria:**
  1. Given draft submitted to in_review, When listing versions, Then at least one snapshot exists.
  2. Given two version ids, When compare, Then deltas compute from snapshots.
- **Evidence required:**
  - API tests
  - Flag documented in .env.example
  - OpenAPI / contract (`Docs/openapi.yaml`) if APIs touched
- **Risks & rollback:**
  - Risks: DB growth — limit snapshots per layout in demo.
  - Rollback steps: LAYOUT_VERSIONING=0; ignore versions table.
- **Spec link:** `openspec/changes/SEED-08c-layout-versions/` (unit: `Docs/seeds/SEED-08c-layout-versions.md`)
- **Engineering skills invoked:** rollback-and-flags

## PR checklist (manual)

- [ ] OpenAPI updated before API shape changes
- [ ] Tests/evidence attached
- [ ] UI checked against `ui/ShelfPilot.dc.html` when UI touched
- [ ] Intent review before merge
