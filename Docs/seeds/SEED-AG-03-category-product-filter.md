---
seedId: SEED-AG-03-category-product-filter
phase: AG
status: Done
stack: demo
change: layout-autogen-walkthrough
---

# SEED-AG-03-category-product-filter

## SEED Unit

- **SEED-ID:** SEED-AG-03-category-product-filter
- **Status:** Done
- **Goal:** Planogram lists category + descendants; block unmapped shelves.
- **Scope:**
  - In scope: PlanogramPanel filter; API `shelf_category_required`; helper for descendant IDs
  - Out of scope: multi-category shelves
- **Constraints:**
  - Security: enforce on API not only UI
  - Backward compatibility: mapped shelves behave as today with wider filter
- **Acceptance criteria:**
  1. Given unmapped shelf, When POST planogram, Then 400 `shelf_category_required`.
  2. Given parent category on shelf, When listing products, Then child-category SKUs appear.
- **Evidence required:** API + light UI smoke
- **Risks & rollback:** Revert to all-products list; remove API gate.
- **Spec link:** `openspec/changes/layout-autogen-walkthrough/`
- **Engineering skills:** none
