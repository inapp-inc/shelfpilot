# Tasks — import-store-type-dialog

## SEED-IM-01 — Import dialog component
- [x] Create `web/src/catalog/ImportDialog.jsx` (modal): store-type `<select>` (default active), drag & drop zone + click-to-browse, file name/size, inline validation, Import/Cancel.
- [x] Drop-zone `.import-dropzone` styles (+ active state) in `styles.css`.

## SEED-IM-02 — Wire into import flow
- [x] `CatalogPage.jsx`: Import Excel button opens the dialog (`onImport`).
- [x] `App.jsx`: dialog open state; `handleImportFile(file, storeTypeId)`; compute vertical from `STORE_TYPES`; switch + refresh to selected vertical.

## SEED-IM-03 — Store-type-aware parser
- [x] `parseCatalogImportWorkbook(buffer, { defaultVertical })` threads through `normalizeImportPayload` / `parseRow`.
- [x] `resolveVertical(storeType, vertical, defaultVertical)` uses selected type instead of `retail` for blank/unknown rows.

## SEED-IM-04 — Styles, tests, docs
- [x] Fold `specs/catalog/spec.md` into `openspec/specs/catalog/spec.md`.
- [ ] Unit test: web has no test runner (`npm test` is a smoke stub); parser change verified by static review + lint. Run `npm run build` manually to confirm bundle.
- [x] Update `Docs/FSD_ShelfPilot.md` (Catalog import) — see note below.
- [ ] Run web build (blocked: local shell environment not returning exit status; run `cd codebase/web && npm run build` manually).
