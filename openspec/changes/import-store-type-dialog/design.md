# Design: Import dialog — store type + drag & drop

## Current flow (baseline)

- `CatalogPage` **Import Excel** button → `onImport` → `fileInputRef.click()` (hidden
  `<input type="file">`) → `handleImportFile(e)` in `App.jsx`.
- `handleImportFile` reads the buffer → `parseCatalogImportWorkbook(buffer)` →
  `POST /catalog/import`.
- `importExcel.js` `resolveVertical(storeType, vertical)`:
  ```js
  if (!raw) return "retail";   // <-- silent retail fallback (the bug)
  ```
- Target vertical is derived from the imported rows, then the UI switches to it.

## New flow

```
Import Excel button
      │
      ▼
ImportDialog (modal)
   • store type <select>  (default = active store type)
   • drag & drop / browse file
   • Import (enabled when type + file chosen)
      │  onImport(file, storeTypeId)
      ▼
handleImportFile(file, storeTypeId)
   • vertical = STORE_TYPES[storeTypeId].vertical
   • parseCatalogImportWorkbook(buffer, { defaultVertical: vertical })
   • POST /catalog/import
   • switch UI to vertical + refresh
```

## Component: `ImportDialog.jsx`

Props: `{ open, storeTypes, defaultStoreTypeId, importing, onImport, onClose }`.

State: `storeTypeId`, `file`, `dragOver`.

Behavior:
- Uses the shared `.modal-backdrop` / `.modal` styles.
- Drop zone handles `onDragOver` (set `dragOver`, `preventDefault`), `onDragLeave`,
  `onDrop` (take `dataTransfer.files[0]`); click opens a hidden `<input type="file">`.
- Validate extension in `[.xlsx, .xls, .csv]`; otherwise show inline error.
- `Import` calls `onImport(file, storeTypeId)`; button shows "Importing…" while
  `importing`.

## Parser change: `importExcel.js`

- `parseCatalogImportWorkbook(buffer, options = {})` accepts `options.defaultVertical`.
- Thread `defaultVertical` into `normalizeImportPayload` and `parseRow`.
- `resolveVertical(storeType, vertical, defaultVertical)`:
  ```js
  const v = cellStr(vertical).toLowerCase();
  if (v) return v;
  const raw = cellStr(storeType);
  if (!raw) return defaultVertical || "retail";   // selected type instead of retail
  // ...existing id/label/vertical matching...
  return defaultVertical || lower;
  ```
- Net effect: the chosen store type is the target; explicit valid `storeType` cells are
  still honored, blanks/unknowns resolve to the chosen type (not retail).

## Wiring

- `CatalogPage`: replace `onImport` (which triggered the file input) with
  `onOpenImport` that opens the dialog; render `<ImportDialog />` (or lift dialog to
  `App`). Keep the hidden file input only inside the dialog.
- `App.jsx`:
  - `handleImportFile(file, storeTypeId)` — take an explicit `file` + `storeTypeId`
    (no longer only an input event); compute `vertical` from `STORE_TYPES`.
  - Pass `defaultVertical` to the parser; after import, `setVertical(vertical)` +
    `loadCatalog(vertical)` (already present, now driven by the selection).

## Files touched (implementation preview)

| File | Change |
|------|--------|
| `web/src/catalog/ImportDialog.jsx` | **New** modal: store-type select + drag & drop |
| `web/src/catalog/CatalogPage.jsx` | Import button opens dialog |
| `web/src/App.jsx` | Dialog state; `handleImportFile(file, storeTypeId)`; pass `defaultVertical` |
| `web/src/catalog/importExcel.js` | `parseCatalogImportWorkbook(buffer, { defaultVertical })`; `resolveVertical` fallback |
| `web/src/styles.css` | Drag & drop zone styles |

## Backward compatibility

- Sheets with a valid `storeType` column import exactly as before.
- The only behavioral change for blank/unknown `storeType` is that rows resolve to the
  **user-selected** store type instead of `retail`.
