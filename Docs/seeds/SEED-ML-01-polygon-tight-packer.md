---
seedId: SEED-ML-01-polygon-tight-packer
phase: ML
status: Done
stack: demo
change: merch-layers-polygon-fix
---

# SEED-ML-01-polygon-tight-packer

## SEED Unit

- **SEED-ID:** SEED-ML-01-polygon-tight-packer
- **Status:** Done
- **Goal:** Fix autogen overflow outside drawn polygon; clip aisles; harden containment tests.
- **Scope:** In: packer clip, post-drop, aisle lengthMeters sync with UI. Out: LLM.
- **Acceptance criteria:**
  1. Given L-shaped polygon, When autogenerate, Then containmentViolations length is 0.
  2. Given generate, When viewing 2D, Then no aisle/shelf renders outside polygon outline.
- **Evidence:** Unit + route tests with irregular polygon
- **Spec link:** `openspec/changes/merch-layers-polygon-fix/`
