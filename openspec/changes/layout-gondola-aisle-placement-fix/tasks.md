# Tasks — layout-gondola-aisle-placement-fix

**Status:** Draft — document approved before implementation  
**Reference:** [proposal.md](./proposal.md), [design.md](./design.md)

---

## Phase 0 — Align & approve

- [ ] Stakeholder review of target runway model (walk aisle vs gondola A1/A2)
- [ ] Confirm open questions in design §10 (compact mode, mixed cross-aisles, legacy merge)

---

## SEED-CF-16 — Runway packer v2 (API)

- [x] Refactor `layoutPacker.js` to strip-based runway loop
- [x] Implement collinear aisle merge (replace `aisleNearDuplicate` tolerance hack)
- [x] Shared boundary: south aisle of strip N = north aisle of strip N+1 (single entity)
- [x] Remove unconditional `fillCrossCorridors()`; gate behind `crossAisles: true` for mixed only
- [x] Return `gondolaUnits` count in autogen `generated` block
- [x] Unit tests: dedup, shallow zone, no orphan aisles

---

## SEED-CF-17 — Compact layout mode (API)

- [x] When runway height insufficient: place pairs without aisle entities OR skip strip
- [x] Never emit aisles when zero gondola pairs placed in strip
- [x] Test: small polygon → at least one pair OR explicit empty result with message

---

## SEED-CF-18 — Gondola unit canvas (web)

- [x] Stable `GondolaUnit` render: spine + A1/A2 split + facing ticks
- [x] Walk aisle label prefix “Walk aisle” (distinct styling)
- [x] Selection: click unit → front shelf; face toggle for back
- [x] Fix edge cases where `pairId` missing breaks merge

---

## SEED-CF-19 — Pipeline integrity (API)

- [x] `applyFixtureTypesToShelves`: preserve `pairId`, `pairRole`, never force `doubleSided` on pairs
- [x] Integration test: autogen → category mix → GET layout → all pairs intact
- [ ] Planogram auto-fill uses front/back categories correctly per pair

---

## SEED-CF-20 — Copy & counts (web)

- [x] Toast: `N gondolas (front+back) · M walk aisles`
- [x] Smart Generate hint + palette Generate label
- [x] ShelfNumberLegend: group by gondola letter with A1/A2 sub-entries

---

## SEED-CF-21 — Role-based nav & pages (web)

- [x] `rolePermissions.js` — module/tab matrix aligned to API RBAC
- [x] Filter header nav by role
- [x] Route guard — redirect forbidden deep links
- [x] Admin tabs: Admin = all; Approver = audit only; Viewer = no Admin nav
- [x] `editDisabled` on portfolio, catalog, drawers from permission helpers
- [ ] Manual QA matrix (Viewer / Designer / Approver / Admin)

---

## Verification checklist

- [ ] 12×8 m layout: visible gondola with A1/A2, no overlapping aisles
- [ ] 20×15 m layout: multiple runways, aisle count matches boundaries (not 2× duplicated)
- [ ] Refresh layout editor: no JS errors; pairs render after reload
- [ ] Viewer: no Admin in nav; `/admin` redirects
- [ ] Approver: Admin nav shows Audit tab only
- [ ] API full test suite green
- [ ] Web build succeeds

---

## Evidence required

- Before/after canvas screenshots (same polygon)
- Autogen JSON snippet showing `pairId` pairs + non-overlapping aisle footprints
- Test output for new packer tests
