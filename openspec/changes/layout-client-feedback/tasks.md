# Tasks — layout-client-feedback

**Status:** Approved / Implemented 2026-07-21

---

## SEED-CF-01 — Store envelope + dual boundary (API + web)

- [x] Add `storeEnvelope` to layout normalize/persist (SQLite payload); keep create-time W×D as envelope on Apply.
- [x] Change `applyArea()` to PATCH polygon without replacing envelope dimensions incorrectly.
- [x] Canvas: render outer store envelope (secondary colour) + inner fixture polygon (crimson).
- [x] Meter bar: `Store W×D · Fixture zone W×D`.
- [x] Update `Docs/openapi.yaml`: `StoreEnvelope`, `Layout.storeEnvelope`.

## SEED-CF-02 — Autogen containment + fixture types (API + web)

- [x] Filter autogen output through `entityInsideLayout`; never persist outside shelves/aisles.
- [x] Add `fixtureType` to category mix + default mapping (produce → storage, etc.).
- [x] Smart Generate UI: show/edit fixture type per category row (optional column).
- [x] Tests: L-polygon autogen → 0 containment violations; produce slot → storage type.

## SEED-CF-03 — Viewport-fit editor + focus zoom (web)

- [x] CSS: editor fills viewport; side rail scrolls internally; no body scroll for tabs.
- [x] **Fit to view** on editor open and after Apply area.
- [x] Focus dropdown in meter bar: categories + “Selection” → zoom/pan to bounds.
- [ ] Manual: 1366×768 — Merchandising tabs visible without page scroll (verify in browser).

## SEED-CF-04 — Shelf name in Properties (web)

- [x] Properties panel: editable shelf **name/label**, display number, type summary.
- [x] PATCH `label` on change (debounced or blur).

## SEED-CF-05 — Side rail tab alignment (web)

- [x] Fix tab strip alignment when Merchandising content is long (flex, overflow, no horizontal shift).
- [ ] Verify all three tabs at 100% / 125% browser zoom (verify in browser).

## SEED-CF-06 — Resizable polygon floor area (API + web)

- [x] **Edit area** palette mode: drag vertices, optional edge handles.
- [x] PATCH polygon on save; validate ring; containment re-check for fixtures.
- [x] Minimum 3 vertices; delete vertex when >3 (delete via keyboard deferred).

## SEED-CF-07 — Review workflow + button gating (API + web)

- [x] Add `reviewComment`, `reviewedAt`, `reviewedBy`, `contentRevision`, `submittedRevision` (or equivalent).
- [x] Reject modal requires comment; show comment banner when status `rejected`.
- [x] Hide **Submit for review** when `in_review`/`approved` unless layout dirty since submit.
- [x] Hide **Approve/Reject** when not `in_review` or after action until new submission.
- [x] Dedicated review endpoints (`/review/submit`, `/approve`, `/reject`).
- [x] OpenAPI + audit entries.

## SEED-CF-08 — Docs, tests, validation

- [x] Spec deltas in this change folder; fold on closeout deferred.
- [x] API tests: review gating, reject comment required, envelope persist.
- [x] Run full `npm test` (api) + `npm run build` (web).
- [ ] Update `FSD_DELTA.md` → `Docs/FSD_ShelfPilot.md` on closeout.

---

## Suggested implementation order (completed)

CF-05 → CF-04 → CF-03 → CF-01 → CF-06 → CF-02 → CF-07 → CF-08
