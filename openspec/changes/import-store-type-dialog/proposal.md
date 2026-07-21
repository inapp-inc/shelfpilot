# Proposal: Import dialog — choose store type + drag & drop

**Status:** Proposed (for review) — 2026-07-20

## Summary

Today, clicking **Import Excel** immediately opens the OS file picker and the target
store type is inferred per row from the `storeType` column. When that column is missing
or unrecognized, `resolveVertical` silently falls back to **`retail`** — so a
hypermarket product sheet gets imported into the **Retail** catalog. Users have no way
to state the intended store type at import time.

This change replaces the direct file-picker with an **Import dialog** that:

1. Asks the user to **select the store type** (Hypermarket, Supermarket, Pharmacy,
   Beauty, Apparel, Convenience) — defaulting to the currently active store type.
2. Provides a **drag-and-drop** area (plus click-to-browse) for the `.xlsx` / `.xls` /
   `.csv` file.
3. Imports the catalog into the **selected** store type, so products/categories map to
   the correct vertical instead of defaulting to retail.

## Deliverables

### 1. Import dialog (modal)

- Opens from the **Import Excel** button on the Products page.
- **Store type** selector (from `STORE_TYPES`), pre-selected to the active store type.
- **Drag & drop** zone with visible drop state; also click-to-browse. Accepts
  `.xlsx`, `.xls`, `.csv`. Shows the chosen file name + size.
- **Import** action disabled until both a store type and a file are chosen.
- Cancel / close returns without importing.

### 2. Store-type-aware import

- The selected store type is the **authoritative target vertical** for the import.
- Rows without a recognized `storeType` use the selected store type instead of the
  `retail` fallback.
- After import, the catalog view switches to the selected store type and refreshes.

## SEED units

| ID | Scope |
|----|-------|
| SEED-IM-01 | `ImportDialog` component (store-type select + drag & drop) |
| SEED-IM-02 | Wire dialog into `CatalogPage` / `App` import flow |
| SEED-IM-03 | `parseCatalogImportWorkbook(buffer, { defaultVertical })` + `resolveVertical` fallback fix |
| SEED-IM-04 | Styles, tests, docs/spec fold |

## Success criteria

- Clicking **Import Excel** opens the dialog (not the raw file picker).
- Selecting **Hypermarket** + dropping a sheet imports products into the **Hypermarket**
  catalog (never silently into Retail).
- Drag-and-drop and click-to-browse both work; unsupported files are rejected with a
  clear message.
- Existing sheets that include a valid `storeType` column continue to work.

## Relationship to recent work

| Prior change | Relationship |
|--------------|--------------|
| catalog-merch-ui-v2 / Excel import | Extends the import UX with store-type selection |
| visible-aisles-planogram-products | Complements catalog→planogram mapping (correct vertical means products list) |

See [REVIEW.md](./REVIEW.md) for decisions.
