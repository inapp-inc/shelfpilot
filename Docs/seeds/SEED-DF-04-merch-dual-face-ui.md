# SEED-DF-04 — Merchandising dual-face UI

**Change:** `dual-face-numbered-shelves-strict-polygon` · **Status:** Pending review

## Scope
- `MerchandisingPanel.jsx`: Face A | Face B tabs when `doubleSided`
- Planogram API calls pass `faceId`
- Category assignment per face (or linked toggle "same both sides")
- Header shows `Shelf #12 · Gondola`

## Acceptance
- Select gondola → switch Face B → product list filters to Face B category
- Placements on Face A do not appear on Face B level view
- Single-sided shelf: no face tabs

## Evidence
- Manual walkthrough: place different SKUs on A vs B
- API integration via existing planogram routes
