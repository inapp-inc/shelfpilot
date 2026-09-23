# Proposal: Reference simplified plan import (`newLayout.png`)

**Status:** Implemented — `planTextAnalyze.mjs`, simplified geometry, tests  
**Depends on:** SEED-PI-01…10 (plan fixture import baseline)  
**Reference asset:** `Docs/plan/newLayout.png`

## Summary

Extend plan upload so the **simplified store layout** reference drives:

1. **Store dimension fields** (24 m × 14 m) after analyze  
2. **Text-driven shelf types** (chiller, freezer, gondola, ambient)  
3. **Layout generation** that mirrors the drawing (north refrigeration, four centre gondolas, south ambient, checkout/BOH obstacles)

This is a **focused acceptance target** for the existing fixture-import pipeline, not a parallel upload feature.

## Motivation

- Legacy samples (`Layout1`, `Layout2`) are busy and hard to demo.  
- `newLayout.png` has explicit envelope, legend, and zone labels suitable for stakeholder sign-off.  
- Closes the loop: **upload diagram → see dimensions in form → create → layout looks like the picture**.

## Deliverables

| Slice | Folder / work | Outcome |
|-------|---------------|---------|
| PI-11a | Parser + fixtures | Counted CHILLER/FREEZER, Ambient Shelves L×D, zone names |
| PI-11b | Client analyze | Modal fields 24/14; area hint in analysis panel |
| PI-11c | Geometry placement | Four-island template + north/south wall snaps |
| PI-11d | OCR path | PNG upload yields fixture runs (AT-NL-02) |
| PI-11e | Validation | Tests + README + spec sign-off |

## Success criteria

See **§6** in `Docs/PLAN_NEWLAYOUT_REFERENCE_SPEC.md` (AT-NL-01 … AT-NL-06).

## Out of scope

- Pixel-perfect CAD import  
- Auto planogram / SKU from drawing  
- Bakery as merchandised category (v1 obstacle only)  
- Multi-page PDF picker  

## Related code

| Area | Path |
|------|------|
| Product spec | `Docs/PLAN_NEWLAYOUT_REFERENCE_SPEC.md` |
| Parser | `codebase/shared/floorPlanFixtures.mjs` |
| Geometry | `codebase/shared/floorPlanGeometry.mjs` |
| Import service | `codebase/api/src/services/planFixtureImport.js` |
| Client | `codebase/web/src/floorPlanImport.js`, `planOcr.js`, `LayoutCreateModal.jsx` |
