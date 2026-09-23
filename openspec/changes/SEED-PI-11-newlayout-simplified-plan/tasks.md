# Tasks: SEED-PI-11 — `newLayout.png` reference import

**Spec:** `Docs/PLAN_NEWLAYOUT_REFERENCE_SPEC.md`  
**Gate:** Product/QA sign-off on spec §6–§7 before starting PI-11c+ in production-bound branches.

## Verification (document-only — current milestone)

- [x] Capture fixture/zone inventory from `Docs/plan/newLayout.png`
- [x] Write change spec with acceptance criteria AT-NL-01…06
- [x] OpenSpec proposal + task list
- [ ] Stakeholder sign-off (§10 in spec)
- [ ] Answer open questions Q1–Q5

## PI-11a — Parser grammar

- [ ] Add `codebase/api/test/fixtures/layout-newlayout-text-extract.txt` (synthetic text from PNG)
- [ ] Extend `parseFixtureRunsFromText` for:
  - [ ] `N x CHILLER` / `N x FREEZER` with L×W
  - [ ] `Ambient Shelves` + `12.0 m × 1.0 m` (or equivalent)
  - [ ] Standalone **CHILLER** / **FREEZER** when count is `1 x`
- [ ] Extend BOH / obstacle parsing for Electrical Room, Lobby, Bakery, Checkout Area (+ sizes where in text)
- [ ] Unit tests: `newlayout-fixture-import.test.js` or extend `plan-fixture-import.test.js`

## PI-11b — Envelope → create modal fields

- [ ] Ensure `parseStoreDimensionsFromText` matches **24.00 m** × **14.00 m** patterns on simplified plan
- [ ] Client: after analyze, set `widthMeters` / `depthMeters` to 24 / 14 for extract fixture
- [ ] Optional UI: show computed area 336 m² in analysis panel
- [ ] Test AT-NL-01 (vitest or API)

## PI-11c — Geometry placement

- [ ] North-wall snap for 6 refrigeration runs (1 chilled + 5 frozen)
- [ ] Template: four N–S gondola islands with 2.4 m horizontal spacing, 1.5 m north aisle, 2.4 m south aisle to ambient
- [ ] South wall: single 12 m ambient run
- [ ] Place obstacle polygons per §2.3
- [ ] Test AT-NL-03 (shelf counts, rough coordinates)

## PI-11d — Raster OCR path

- [ ] Run OCR against `newLayout.png`; tune if labels missing
- [ ] Default import mode to **fixture** when envelope + ≥3 runs detected
- [ ] Test AT-NL-02 on client or integration (env-gated if slow)

## PI-11e — Closeout

- [ ] Update `Docs/plan/README.md` with `newLayout.png` row
- [ ] Update `Docs/DEMO_CHANGES_SUMMARY.md` one-liner
- [ ] Mark spec §10 signed; set proposal **Status: Approved**
- [ ] Manual QA AT-NL-06 screenshot attached to ticket/PR

## Evidence required

- `npm test` in `codebase/api` and `codebase/web` green
- Parser fixture + at least one API test asserting run counts
- Optional: e2e create-from-`newLayout.png` (P2)

## Rollback

- Parser changes are additive; disable via existing `PLAN_FIXTURE_IMPORT_ENABLED` if placement regresses
- Revert geometry template commit only if island placement breaks Layout2 extracts
