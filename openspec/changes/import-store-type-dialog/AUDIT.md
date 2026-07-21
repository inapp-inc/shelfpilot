# Audit: import store-type dialog

## Ask → current behavior → gap

| # | User ask | Current behavior | Gap |
|---|----------|------------------|-----|
| 1 | Products import to wrong store type (retail vs hypermarket) | `resolveVertical` returns `retail` when `storeType` blank/unknown | Silent wrong-vertical mapping |
| 2 | Ask shop type when clicking Import | Import button opens OS file picker directly | No store-type prompt |
| 3 | Drag & drop file option | Only click-to-browse via hidden input | No drop zone |

## Code baseline (verified)

- `web/src/catalog/CatalogPage.jsx` — **Import Excel** button `onClick={onImport}`
  (triggers hidden file input); has a store-type `<select>` in the toolbar for viewing,
  not for import.
- `web/src/App.jsx`
  - `handleImportFile(e)` reads `e.target.files[0]`, parses, POSTs, then derives
    `targetVertical` from imported rows and switches the view.
  - Hidden `<input ref={fileInputRef} type="file">` drives import.
- `web/src/catalog/importExcel.js`
  - `resolveVertical(storeType, vertical)` → `if (!raw) return "retail";` (the silent
    fallback) and returns `lower` for unknown values.
  - `parseCatalogImportWorkbook(buffer)` takes no options; per-row vertical only.
- `web/src/storeTypes.js` — `STORE_TYPES` provides id/label/vertical for the selector.
- `web/src/styles.css` — existing `.modal-backdrop` / `.modal` styles reusable for the dialog.

## Module impact

| Module | Impact |
|--------|--------|
| Catalog import UI | New dialog (store-type select + drag & drop) |
| Import parser | Accept `defaultVertical`; fix retail fallback |
| App import handler | Take explicit file + store type |

## Risk

- Low; front-end only. No API contract change (`POST /catalog/import` unchanged).
- Behavioral change limited to blank/unknown `storeType` rows.
