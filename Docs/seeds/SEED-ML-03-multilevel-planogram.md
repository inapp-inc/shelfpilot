---
seedId: SEED-ML-03-multilevel-planogram
phase: ML
status: Done
stack: demo
change: merch-layers-polygon-fix
---

# SEED-ML-03-multilevel-planogram

## SEED Unit

- **SEED-ID:** SEED-ML-03-multilevel-planogram
- **Status:** Done
- **Goal:** Place different products per shelf level; shelf-type default level templates.
- **Acceptance criteria:**
  1. Given shelf with 2+ levels, When placing product on level 1, Then level 0 placements remain.
  2. Given gondola type template, When placing shelf of that type, Then default levels match config.
- **Evidence:** API planogram levelIndex test + UI smoke
- **Spec link:** `openspec/changes/merch-layers-polygon-fix/`
