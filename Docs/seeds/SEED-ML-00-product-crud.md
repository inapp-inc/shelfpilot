---
seedId: SEED-ML-00-product-crud
phase: ML
status: Done
stack: demo
change: merch-layers-polygon-fix
---

# SEED-ML-00-product-crud

## SEED Unit

- **SEED-ID:** SEED-ML-00-product-crud
- **Status:** Done
- **Goal:** Real add/update product in Catalog UI + PATCH `/products/{id}` in OpenAPI/API.
- **Scope:** In: create/edit form, dimensions attributes, OpenAPI. Out: delete, PIM sync.
- **Acceptance criteria:**
  1. Given Designer, When creating a product, Then it appears in list and planogram picker.
  2. Given existing product, When PATCH widthMeters, Then facing preview reflects new width.
- **Evidence:** API test + manual catalog smoke; OpenAPI
- **Spec link:** `openspec/changes/merch-layers-polygon-fix/`
