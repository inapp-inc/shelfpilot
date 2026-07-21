# Proposal: Catalog & merchandising UI v2

**Status:** Implemented (2026-07-15)

## Why

Users can map categories to shelves but struggle to merchandise across **all** categories — the experience collapses to whichever category they manually seeded (often Grocery). The catalog page Add product flow is basic, there is **no Add category UI**, and the layout editor right rail splits merchandising across three disconnected panels.

## What we will deliver

### A. Catalog page redesign (`Products & Categories`)

| Before | After |
|--------|-------|
| Static category list + full product table | **Master–detail**: category tree (left) filters product grid (right) |
| No Add category | **+ Add category** drawer (name, parent, color, vertical) |
| Minimal inline product form | **Product drawer** (create + edit): name, SKU, hierarchical category, width/height, optional attributes |
| Table shows `categoryId` | Table shows **category name** + color chip |
| Import/Export only bulk path | Import/Export retained; inline CRUD is primary |

### B. Layout editor redesign (right rail)

| Before | After |
|--------|-------|
| 3 stacked panels | **Tabbed rail**: `Properties` · `Merchandising` |
| Category + Planogram separate | **Merchandising tab** = guided stepper: **① Category** → **② Planogram (by level)** |
| Uses shell vertical pill | **Syncs to `layout.vertical`** on open; badge shows active vertical |
| Empty product list = dead end | **"Add product for this category"** quick action opens drawer pre-filled |

### C. Shared components (reusable)

- `CategoryTreePicker` — hierarchical select with indent/optgroup, product count badge
- `CategoryTree` — sidebar tree with expand/collapse
- `ProductFormDrawer` — slide-over used by Catalog and Layout editor
- `CategoryFormDrawer` — slide-over for add/edit category
- `MerchandisingPanel` — replaces `CategoryMappingPanel` + `PlanogramPanel` in editor

### D. Data / behavior fixes

1. On layout open: `setVertical(layout.vertical)` + reload catalog for that vertical.
2. LayoutEditor receives `categories` and `products` scoped to **`layout.vertical`**, not shell pill alone.
3. Run/document `npm run seed:demo` so all verticals have representative products out of the box.
4. Optional: `PATCH /categories/{id}` for rename/color (stretch; can defer to v2.1).

## Out of scope

- LLM autogenerate categories/zones
- Multi-tenant catalog
- Product images / barcodes

## Success criteria

- Retail layout: map shelf to **Electronics**, **Home**, **Grocery**, or **Seasonal** — each shows correct filtered products (after demo seed).
- Pharmacy layout: map shelf to **OTC** shows Pain Relief + Cold & Flu products (children).
- Add category + add product from Catalog **and** from layout editor quick-add.
- No vertical mismatch between catalog load and planogram API validation.

## SEED units (implementation order)

| ID | Scope |
|----|-------|
| SEED-CM-00 | Vertical sync + catalog scoping fix |
| SEED-CM-01 | Shared `CategoryTreePicker` + `buildCategoryTree` util |
| SEED-CM-02 | Catalog page master–detail + category CRUD drawer |
| SEED-CM-03 | Product drawer (create/edit) replacing inline form |
| SEED-CM-04 | Editor tabbed rail + `MerchandisingPanel` stepper |
| SEED-CM-05 | Quick-add product from planogram + demo seed docs |
| SEED-CM-06 | Tests + baseline spec deltas + handover |

## Your review checklist

- [ ] Agree with tabbed editor rail vs. other layout (e.g. bottom drawer)?
- [ ] Category add/edit: drawer OK or inline modal?
- [ ] Include `PATCH /categories/{id}` in v2 or defer?
- [ ] Approve vertical auto-sync when opening a layout (may change shell pill)?
