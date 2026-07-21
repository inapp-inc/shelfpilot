# SEED-DF-05 — Containment hardening

**Change:** `dual-face-numbered-shelves-strict-polygon` · **Status:** Pending review

## Scope
- Verify/finish grid-sampling in `polygonContainment.js` (baseline from merch-layers fix)
- Rotated shelf footprint in packer
- Autogen + manual PATCH: zero tolerance outside polygon
- Hide or omit shelves that fail containment on canvas (existing partial)

## Acceptance
- L-shape + user irregular polygon: `validation.containmentViolations` empty after generate
- No shelf AABB corner outside polygon (grid sample test)
- PATCH outside polygon → 400 `containment_violation`

## Evidence
- Extend `merch-layers.test.js` / new `strict-polygon.test.js`
- Regression on 28 existing API tests
