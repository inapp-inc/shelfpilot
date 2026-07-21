# Root-cause audit — Catalog & layout editor UI

**Change:** `catalog-merch-ui-v2`  
**Date:** 2026-07-15  
**Reporter symptom:** Can add categories; can only fill **Grocery** products in layout editor; Add product needs improvement.

## Verified root causes

| ID | Sev | Issue | Why it feels like "Grocery only" |
|----|-----|-------|----------------------------------|
| R1 | **S1** | **Layout vertical ≠ catalog vertical** | Opening a layout does **not** sync the shell vertical pill to `layout.vertical`. Catalog (categories + products) loads from the **pill**, but planogram API validates against **`layout.vertical`**. Mismatch → wrong product list or API rejects placement. |
| R2 | **S1** | **Sparse demo data without `seed:demo`** | Default SQLite seed has **3 products total** across all verticals (not 4 per retail category). Without `npm run seed:demo`, retail only has `electronics` product in DB — user-added **Grocery** SKUs become the only ones that match a mapped shelf. |
| R3 | **S2** | **No Add Category UI** | `POST /categories` exists; UI only supports Import or shelf mapping. Users think they "added a category" via mapping, but catalog tree never gets a matching product category. |
| R4 | **S2** | **Flat category pickers** | Product form and shelf mapping use a **flat `<select>`** without parent/child grouping. Pharmacy child categories (Pain Relief under OTC) look like peers; easy to map shelf to parent but add product to child (or vice versa) → empty planogram list. |
| R5 | **S2** | **Fragmented editor right rail** | Three stacked panels (Properties → Category → Planogram) with no guided flow. Users map category in panel 2, scroll to panel 3, see empty list, assume app is broken. |
| R6 | **S3** | **Product table shows raw `categoryId`** | Catalog table column is `categoryId` not human name — hard to verify product/category alignment. |
| R7 | **S3** | **Add product form is minimal** | Inline grid form only; no drawer, no category filter context, no validation hints, defaults to `cats[0]` (first category in flat list). |
| R8 | **S3** | **No category-scoped product filter on Catalog page** | Category tree is display-only; clicking a category does not filter the product table. |

## What already works (keep)

- Category-gated planogram logic (`filterProductsForShelf` + API `productAllowedForShelf`) is **correct** when categories/products/vertical align.
- Product PATCH API works.
- Shelf category mapping API works (`POST /layouts/{id}/mappings`).

## Design intent after fix

> **One vertical context per layout session.** Catalog and planogram always use **`layout.vertical`**. Category tree is hierarchical everywhere. Merchandising is a **guided 2-step** flow on the shelf: (1) assign category → (2) place products by level, with quick-add product when list is empty.
