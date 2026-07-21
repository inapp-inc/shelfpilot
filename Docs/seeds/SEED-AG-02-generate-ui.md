---
seedId: SEED-AG-02-generate-ui
phase: AG
status: Done
stack: demo
change: layout-autogen-walkthrough
---

# SEED-AG-02-generate-ui

## SEED Unit

- **SEED-ID:** SEED-AG-02-generate-ui
- **Status:** Done
- **Goal:** Draw-area tool + Generate dialog with replace confirm wired to autogenerate API.
- **Scope:**
  - In scope: polygon draw/edit handles on Canvas2D; Generate button; orientation select; confirm replace
  - Out of scope: walk 3D; category filter
- **Constraints:**
  - Backward compatibility: existing palette DnD remains
  - Observability: N/A — UI
- **Acceptance criteria:**
  1. Given drawn polygon, When Generate confirmed, Then aisles/shelves appear on canvas inside boundary.
  2. Given existing shelves, When Generate without confirm, Then no replace.
- **Evidence required:** Manual smoke checklist
- **Risks & rollback:** Hide Generate behind flag.
- **Spec link:** `openspec/changes/layout-autogen-walkthrough/`
- **Engineering skills:** none
