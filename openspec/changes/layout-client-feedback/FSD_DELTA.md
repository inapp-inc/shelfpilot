# FSD delta — layout-client-feedback

Target: `Docs/FSD_ShelfPilot.md` (apply after implementation)

## Epic C — Layout Editor / Floor area (MODIFY)

- Layouts distinguish **store envelope** (full building footprint) from **fixture zone** (drawn polygon). Apply area saves the polygon without discarding the outer store dimensions; both render on canvas in distinct colours.
- Designers can **edit polygon vertices** after apply (Edit area mode).

## Epic C — Layout Editor / Viewport (ADD)

- Editor fits within viewport; side panel tabs remain visible without page scroll.
- **Fit to view** and **Focus** (by category or selection) zoom the canvas to relevant fixtures.

## Epic F3 — Smart Autogenerate (MODIFY)

- Generated fixtures never persist outside the fixture polygon.
- Category mix may specify **fixture type** (shelf, gondola, rack, storage); defaults map produce/vegetable categories to storage.

## Epic C — Properties panel (MODIFY)

- Selected shelf shows **editable name/label** and display identity in Properties tab.

## Epic G — Review workflow (ADD/MODIFY)

- Reject requires a **comment** visible to the designer.
- **Submit for review** hidden after submission until the layout is edited again.
- **Approve/Reject** hidden except when a layout is in review awaiting decision; after approval, hidden until a new submission cycle.

## OpenAPI (additive)

- `Layout.storeEnvelope`, review metadata fields, review action endpoints.

## Acceptance additions

| ID | Criterion |
|----|-----------|
| CF-AC-1 | Apply polygon inside store → outer envelope visible in second colour |
| CF-AC-2 | Autogen on irregular polygon → zero outside shelves |
| CF-AC-3 | Merchandising tab reachable without body scroll on 1366×768 |
| CF-AC-4 | Reject without comment blocked; comment shown when rejected |
| CF-AC-5 | Submit hidden in_review until edit; Approve hidden after approve until resubmit |
