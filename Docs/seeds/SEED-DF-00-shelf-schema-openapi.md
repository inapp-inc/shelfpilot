# SEED-DF-00 — Shelf schema: displayNumber, faces[], OpenAPI v0.7

**Change:** `dual-face-numbered-shelves-strict-polygon` · **Status:** Pending review

## Scope
- Add `displayNumber`, `doubleSided`, `faces[]` to Shelf model
- `ShelfFace`: `{ id: "A"|"B", categoryId, color, planogram[] }`
- Planogram POST: optional `faceId`
- `layoutNormalize.js`: legacy → faces synthesis
- OpenAPI bump to **v0.7.0**

## Acceptance
- GET layout returns shelves with faces; legacy layouts still load
- POST planogram with `faceId: B` updates Face B only
- Normalization test: shelf with only `categoryId` → single Face A

## Evidence
- API unit tests for normalize + planogram face routing
- OpenAPI validates sample payloads
