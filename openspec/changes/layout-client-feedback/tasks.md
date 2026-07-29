# Tasks — layout-client-feedback

**Status:** Approved / Implemented — draw UX + dual-face 3D 2026-07-27

**Reference:** [Docs/Standard Methods for Store Layout Design.md](../../Docs/Standard%20Methods%20for%20Store%20Layout%20Design.md)

---

## Methodology alignment matrix

| Standard method | SEED | Status |
|-----------------|------|--------|
| Measurement-first, draw-second | CF-01 | Done |
| Grid-based scaled canvas | CF-03 | Done |
| Fixture templates / libraries | CF-02 | Done |
| Adjacency & flow planning | CF-03 | Done |
| Iterative what-if adjustment | CF-06 | Done (edge handles added) |
| Compliance-driven constraints | CF-02 | Done |
| 3D walkthrough for validation | CF-09 | Done (UX hint) |
| Reuse / master layouts | CF-10 | Done (clone layout) |
| Planogram / facing | (shelf-face-letter-number-labels) | Done |
| Line-by-line polygon draw | CF-11 | Done |
| Dual-face 3D + vertical aisles | CF-11 | Done |
| Front+back shelf pair (2 physical shelves) | CF-12 | Done |

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
- [x] Viewport CSS verified in code (`editor-layout-root` height calc).

## SEED-CF-04 — Shelf name in Properties (web)

- [x] Properties panel: editable shelf **name/label**, face label summary, type summary.
- [x] PATCH `label` on change (debounced or blur).

## SEED-CF-05 — Side rail tab alignment (web)

- [x] Fix tab strip alignment when Merchandising content is long (flex, overflow, no horizontal shift).
- [x] Rail body scroll containment in CSS.

## SEED-CF-06 — Resizable polygon floor area (API + web)

- [x] **Edit area** palette mode: drag vertices.
- [x] **Edge midpoint drag** — translate edge segment (both endpoints move together).
- [x] PATCH polygon on save; validate ring; containment re-check for fixtures.
- [x] Minimum 3 vertices.

## SEED-CF-07 — Review workflow + button gating (API + web)

- [x] Add `reviewComment`, `reviewedAt`, `reviewedBy`, `contentRevision`, `submittedRevision`.
- [x] Reject modal requires comment; show comment banner when status `rejected`.
- [x] Hide **Submit for review** when `in_review`/`approved` unless layout dirty since submit.
- [x] Hide **Approve/Reject** when not `in_review` or after action until new submission.
- [x] Dedicated review endpoints (`/review/submit`, `/approve`, `/reject`).
- [x] OpenAPI + audit entries.

## SEED-CF-08 — Docs, tests, validation

- [x] Spec deltas in this change folder.
- [x] API tests: review gating, reject comment required, envelope persist.
- [x] Run full `npm test` (api) + `npm run build` (web).
- [x] Fold `FSD_DELTA.md` → `Docs/FSD_ShelfPilot.md` (§5g).

## SEED-CF-09 — Methodology UX (web)

- [x] Editor hint: measurement-first workflow (store metres → fixture zone → templates).
- [x] 3D mode hint: 2D is source of truth; Orbit/Walk for stakeholder validation.

## SEED-CF-10 — Clone layout / master reuse (API + web)

- [x] `POST /layouts/:layoutId/clone` — deep copy as new draft layout.
- [x] Portfolio **Duplicate** action on layout cards.
- [x] API test: clone preserves geometry and fixtures; resets review state.

---

## SEED-CF-11 — Rubber-band draw + dual-face 3D + vertical aisles (web)

- [x] **Draw area**: rubber-band line from last vertex to cursor; green snap on start point to close.
- [x] Close polygon by clicking first vertex or **Apply area** (3+ points).
- [x] Fix draft vertex drag (`draftDrag.rect` reference).
- [x] **Scene3D**: vertical aisles use length along Z; horizontal along X.
- [x] **Scene3D**: dual-face gondola — spine, split boards, Face A / Face B planograms on opposite sides.
- [x] **Canvas2D**: gondola spine divider on dual shelves; vertical aisle dim label (run × width).
- [x] **Autogen**: gondola runway — aisle · double-sided row · aisle; Face A/B `facingDeg` opposite.
- [x] Docs: proposal + tasks updated; `npm test` + `npm run build`.

## SEED-CF-12 — Front + back shelf pair (API + web)

- [x] Autogen creates **two physical shelves** per unit (`pairId`, `pairRole: front|back`) sharing one footprint.
- [x] Back shelf rotation = front + 180° via `oppositeShelfOrigin`.
- [x] Shared `displayNumber` → labels A1 (front) / A2 (back).
- [x] Place / move / delete keeps the pair in sync.
- [x] OpenAPI `pairId` / `pairRole`; tests for pairs.

---

## Suggested implementation order (completed)

CF-05 → CF-04 → CF-03 → CF-01 → CF-06 → CF-02 → CF-07 → CF-09 → CF-10 → CF-11 → CF-12 → CF-08
