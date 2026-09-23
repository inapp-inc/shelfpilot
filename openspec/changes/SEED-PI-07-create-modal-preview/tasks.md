# Tasks — SEED-PI-07-create-modal-preview

- [x] `LayoutCreateModal.jsx`:
  - [x] When `fixturePlan.runs.length > 0`, show **Import mode**: Fixture layout vs Store envelope only
  - [x] Table: label, kind, length, depth, bays, levels
  - [x] Show scale source + warnings
  - [x] Editable L×W when envelope derived from runs + confirm checkbox
- [x] `validationMessages.js`: require confirm when derived envelope and user has not confirmed
- [x] Styles: `.fixture-import-table` in `styles.css`
- [x] `data-testid`: `layout-create-fixture-preview`, `layout-create-import-mode-fixture`
- [ ] Manual QA: upload PDF with Layout2-style text; set `PLAN_FIXTURE_IMPORT_ENABLED=true` on API
