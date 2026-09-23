# Sample architect floor plans (reference assets)

These files come from an existing retail layout project and are used as **reference inputs** for the proposed **fixture-level plan import** feature (see `Docs/PLAN_IMPORT_FIXTURE_LAYOUT_SPEC.md`).

| File | Description |
|------|-------------|
| `Layout1.png` | Detailed store layout with refrigeration runs (KALEA FREEZE / CHILLED), ambient lengths (`AMBIENT 4.5m`, `Low level shelving 11m long 250mm deep`), aisle widths in **mm** (e.g. 1500, 1250), bay/door counts (`6 DOORS 3 BAYS`), checkouts, entrance ramp. **No single overall “store L × W” label** — scale is implied by many local dimensions. |
| `Layout2.png` | **Proposed ground floor plan** at **1:50** with scale bar (0–5 m). Central gondola blocks (`AMBIENT 9m`, `AMBIENT 10m`, `4 BAYS 5 SHELVES`), perimeter chillers/freezers, checkouts, back-of-house (stairs, lift, store room). Again, fixture and aisle dimensions dominate over store envelope. |
| `newLayout.png` | **Simplified layout plan** for demo/QA: explicit **24.00 m × 14.00 m** store, legend (chiller/freezer, gondola, checkout, non-retail), **1× chiller + 5× freezers** on north wall, **four centre gondolas**, **12 m ambient** south run, checkout / electrical / bakery / lobby zones. **Verification spec:** `Docs/PLAN_NEWLAYOUT_REFERENCE_SPEC.md` (change `SEED-PI-11-newlayout-simplified-plan`). |

## How to use these in review

1. Read `Docs/PLAN_IMPORT_FIXTURE_LAYOUT_SPEC.md` (requirements and open questions).
2. Open each PNG and confirm which labels the product must parse vs which stay manual (e.g. handwritten “TILL”, “5×4”).
3. After spec approval, implementation should include **automated tests** that use **synthetic text extracts** derived from these plans (full PNG OCR is a Phase 2 dependency; do not commit large binary diffs in tests).

## Confidentiality

Treat these drawings as **client/reference material**. Do not publish outside the project without approval.
