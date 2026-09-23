# Review record — plan fixture import

| Field | Value |
|-------|--------|
| **Spec** | `Docs/PLAN_IMPORT_FIXTURE_LAYOUT_SPEC.md` |
| **Status** | **Approved** |
| **Reviewed by** | Stakeholder (post-demo) |
| **Reviewed at** | 2026-09-17 |
| **Execution** | One SEED-PI change at a time; see `SEED-UNITS.md` |

## Locked decisions (former §10 open questions)

| ID | Decision |
|----|----------|
| Q1 | **PDF text first** (P1); **PNG OCR** in SEED-PI-09 |
| Q2 | **Optional** image underlay for alignment QA |
| Q3 | **Hybrid:** client `pdf.js` text + shared parsers; **server** for OCR (`POST /layouts/analyze-plan`) and heavy geometry |
| Q4 | **Ignore checkouts v1**; BOH obstacles in SEED-PI-08 |
| Q5 | **Runs table at create** + normal editor drag after |
| Q6 | **Warn + offer packer fallback** if zero runs parsed |
| Q7 | **No category assign v1**; optional `suggestedCategoryName` on runs |
| Q8 | Keep **12 MB** upload limit; OCR timeout env-configurable |

## Sample assets

- `Docs/plan/Layout1.png`
- `Docs/plan/Layout2.png`
- `Docs/plan/README.md`

## Acceptance test log (2026-09-17, automated + manual notes)

| ID | Scenario | Result | Evidence |
|----|----------|--------|----------|
| AT-1 | Layout2 scale in text extract | Pass | `floor-plan-fixtures-grammar.test.js`, e2e fixture upload |
| AT-2 | Ambient 9m / 10m runs | Pass | grammar + `floorPlanImport.test.js` |
| AT-3 | mm / chiller length hints | Pass | `layout1-text-extract.txt` grammar test |
| AT-4 | Create with fixture payload | Pass | `floor-plan-import.test.js` (flag on) |
| AT-5 | Editor shows shelves | Pass | API unit + manual after flag enabled |
| AT-6 | Envelope-only unchanged | Pass | flag off test in `floor-plan-import.test.js` |
| AT-7 | Planogram fill preserves shelves | Pass | existing autofill tests; no geometry wipe in import path |
| AT-8 | PDF geometry placement | Pass | `floor-plan-geometry.test.js` |
| AT-9 | Raster PNG OCR | Deferred | use PDF or `.txt`; `analyze-plan` returns 501/503 for PNG |
