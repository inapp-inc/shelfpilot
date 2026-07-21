# SEED-DF-03 — Dual-face autogen + category mix

**Change:** `dual-face-numbered-shelves-strict-polygon` · **Status:** Pending review

## Scope
- Extend `categoryMixPacker.js` + `layoutPacker.js`:
  - Assign `displayNumber` sequentially
  - Gondola → `doubleSided: true`, two faces
  - Face categories from mix (same or paired slots)
- Autogen response: `skippedOutsideCount`

## Acceptance
- 50/50 mix on single-sided shelves unchanged behavior
- Hypermarket gondola row: each unit has faces A and B with valid categories
- Numbers unique per layout after generate

## Evidence
- API test: dual-face assignment + displayNumber sequence
- API test: tight polygon → skippedOutsideCount > 0
