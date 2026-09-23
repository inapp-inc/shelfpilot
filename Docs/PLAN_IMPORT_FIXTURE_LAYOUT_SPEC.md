# Architect plan import — fixture & aisle generation (draft for review)

**Status:** **Implemented** (SEED-PI-01…PI-10) — raster PNG OCR deferred; use PDF text layer or `.txt` extract (`Docs/seeds/SEED-PI-PLAN.md`, `openspec/changes/plan-fixture-import/SEED-UNITS.md`)  
**Last updated:** 2026-09-17  
**Stakeholder input:** Post-demo feedback (Sep 2026) — import existing architect plans, derive **shelf and aisle dimensions** from the drawing, and **generate ShelfPilot aisles and shelves** to match (not only store footprint + Smart Generate).  
**Reference samples:** `Docs/plan/Layout1.png`, `Docs/plan/Layout2.png`, `Docs/plan/newLayout.png` (simplified acceptance target — see `Docs/PLAN_NEWLAYOUT_REFERENCE_SPEC.md`)  
**Related (already shipped):** `Docs/FLOOR_PLAN_IMPORT_SPEC.md` — upload → **store envelope** → rules packer / Smart Generate  

---

## 1. Executive summary

ShelfPilot already supports **floor plan upload at layout create**: the user drops PNG/PDF/SVG, the client extracts **overall store length × width** where possible, and the API can **auto-generate fixtures** with the existing **aisle/shelf packer** inside a full-store polygon.

Demo feedback asks for the **next step**: many real plans (including the two samples under `Docs/plan/`) do **not** state one overall store size. They **do** state **fixture runs, bay counts, ambient lengths, aisle widths, and equipment blocks** in metres or millimetres, often with a **drawing scale** (e.g. 1:50).

This document defines a **fixture-aware import** that reuses the **same upload entry point** as today, but adds a pipeline to:

1. **Infer real-world scale** when overall store dimensions are missing.
2. **Parse fixture-level annotations** (length, depth, bays, doors, type hints).
3. **Place aisles and shelves** in layout coordinates (metres) aligned to the drawing geometry.
4. **Leave non-merchandising areas** (checkouts, stairs, BOH) as obstacles or ignored zones unless explicitly in scope.

**Implementation gate:** product/architecture sign-off on this document (including §10 open questions) before coding.

---

## 2. Background & problem

| Today | Gap (demo ask) |
|--------|----------------|
| Upload analyzes text/filename for **store L×W**; aspect ratio fallback (24 m long edge). | Samples rely on **many local dimensions**, not one footprint label. |
| Create with `floorPlanImport` → full-store polygon → **generic packer** grid. | Client expects **shelves/aisles that follow the drawing** (gondola islands, perimeter chillers, labelled ambient runs). |
| Optional legacy **image underlay** on canvas. | Primary need is **correct fixture geometry**, underlay optional for alignment QA. |
| Smart Generate fills **category mix** inside a user-drawn zone. | Import should **seed fixture layout** from the plan; Smart Generate / planogram fill remains a **second step**. |

Without fixture-level import, users must **manually recreate** every run shown on the architect PDF/PNG, which defeats the purpose of upload for migration from legacy layout tools.

---

## 3. Goals & success criteria

### 3.1 Goals

- **G1 — Same UX front door:** “Upload floor plan” in **New store layout** (`LayoutCreateModal`) accepts the same file types; user flow stays familiar.
- **G2 — Scale without overall L×W:** Derive metres-per-pixel (or metres-per-PDF-unit) from **scale bar**, **1:N scale notation**, and/or **trusted dimension strings** on the drawing.
- **G3 — Structured fixture list:** Produce a normalized **import model** (runs, types, lengths, depths, bay/shelf counts, rotation, approximate centreline).
- **G4 — Generate native layout:** Map import model → ShelfPilot **`aisles[]` and `shelves[]`** with dimensions consistent with `shelfTemplates` / fixture catalog.
- **G5 — Review step:** User sees a **summary** (counts, parsed labels, warnings) and can **confirm or edit** key values before create.
- **G6 — Traceability:** Persist `importSource` metadata (file name, scale method, parse confidence) for support and regression tests.

### 3.2 Success criteria (release target)

1. Importing **`Layout2.png`** (with scale 1:50) yields a layout whose **major gondola blocks** match annotated lengths (~9 m / ~10 m) within **±5%** after user confirms scale.
2. Importing a **PDF export** of the same plan (text layer) achieves the same without manual scale entry when scale + at least two consistent dimension strings parse successfully.
3. Generated layout has **non-zero aisles and shelves**, aisle widths respect parsed **mm** aisle labels where present (converted to metres), defaulting to project minimum aisle width when ambiguous.
4. User can open the layout in the **2D editor** and see fixtures **roughly co-located** with the drawing (underlay optional); no requirement for pixel-perfect CAD in v1.
5. **Smart Generate / planogram fill** still works on imported fixtures without wiping geometry.

---

## 4. Reference samples (what is on the drawings)

### 4.1 `Docs/plan/Layout1.png`

Observed annotation types (non-exhaustive):

| Category | Examples on plan | Import relevance |
|----------|------------------|------------------|
| Refrigeration | `KALEA FREEZE`, `KALEA CHILLED`, `6 DOORS 3 BAYS`, model codes | Map to **chiller/freezer fixture types**; length from adjacent **mm** strings (e.g. 3125, 3750). |
| Ambient runs | `AMBIENT 4.5m`, `AMBIENT 3.5m`, `AMBIENT VEG 3m`, `Low level shelving 11m long 250mm deep` | **Run length + depth** → shelf `usableWidthMeters`, `depthMeters`. |
| Aisle / clearance | `1500`, `1250`, `1000` (mm) between runs | **Aisle width** hints for aisle graph / spacing validation. |
| Merch structure | `3 BAYS 3 SHELVES` | Bay count → segment or shelf count along run. |
| Circulation | Entrance, exit, ramp `1:12` | Obstacle or **non-fixture** zone; do not place gondolas. |
| Checkouts | Multiple till positions (handwritten “TILL”) | **Out of scope v1** as fixtures; optional **obstacle** markers in v2. |
| Handwritten markup | Blue ink (FREEZER SHELVES, 5×, etc.) | **Ignore** unless OCR confidence high; show in warnings. |

**Not present:** a single “store 28 m × 17 m” style footprint label.

### 4.2 `Docs/plan/Layout2.png`

| Category | Examples on plan | Import relevance |
|----------|------------------|------------------|
| Drawing scale | `Scale 1:50`, graphic scale bar **0–5 m** | Primary **scale inference** for raster PNG. |
| Title | `PROPOSED GROUND FLOOR PLAN` | Metadata only. |
| Gondola blocks | `AMBIENT 9m`, `AMBIENT 10m`, `4 BAYS 5 SHELVES` | Island **length + bay/shelf** metadata. |
| Perimeter units | `KALEA CHILLED 3750 L86`, `6 DOORS 3 BAYS` | Perimeter **chiller runs** (convert 3750 → 3.75 m). |
| Freezers | `KALEA FREEZE GD 3124 L56`, `4 DOORS 4 BAYS` | Freezer fixture type + length. |
| Aisle path | Red dotted circulation (annotation) | **Not v1** — do not auto-build shopper paths from ink. |
| BOH | Stairs, lift, store room, electrical | **Blocked polygon** or exclude from fixture zone. |
| Checkouts | `CHECKOUTS`, handwritten 1–2–3 | Obstacle / label only in v1. |

These two files are the **acceptance references** for product review and QA scenarios.

---

## 5. Scope

### 5.1 In scope (proposed phases)

| Phase | Deliverable |
|-------|-------------|
| **P0 — Spec & parser design** | This document approved; fixture annotation grammar; import JSON schema; test vectors from plan text extracts. |
| **P1 — Scale + text parse** | Extend shared parsers (`floorPlanDimensions.mjs` + new `floorPlanFixtures.mjs`) for **mm/m lengths**, **scale 1:N**, **AMBIENT n m**, **n BAYS n SHELVES**, **n DOORS n BAYS**; PDF text layer first. |
| **P2 — Raster OCR (PNG/JPG)** | OCR or cloud OCR hook for samples like `Layout1.png` / `Layout2.png` when PDF text unavailable; confidence thresholds. |
| **P3 — Geometry placement** | Map parsed runs to **positions**: detect axis-aligned rectangles (OpenCV-style or PDF vector paths); snap runs to grid; emit aisles/shelves via new `planFixtureImport.js` service (name TBD). |
| **P4 — Create UX** | Extend create modal: **Import mode** toggle or auto-detect “fixture-rich plan” → preview table → confirm → POST with `floorPlanImport.fixturePlan`. |
| **P5 — Hardening** | Warnings, manual overrides, regression tests, OpenAPI update, handover note. |

### 5.2 Out of scope (explicit)

- **ML symbol recognition** of arbitrary architect icons without text (same as `FLOOR_PLAN_IMPORT_SPEC.md` §9).
- **Automatic planogram / SKU** import from the drawing.
- **Multi-page PDF** picker (remain page 1 unless spec revised).
- **Perfect CAD fidelity** (sub-centimetre); target is **merchandising-faithful** layout for ShelfPilot workflows.
- **Shopper path** extraction from coloured annotation lines.
- **Replacing** the existing **rules packer** for plans that only have store L×W (keep current path).

---

## 6. User journey (target)

Same entry as today; additional branches after analyze:

```
Upload PNG / PDF / SVG  (existing dropzone)
        │
        ▼
Analyze file  (extend analyzeFloorPlanUpload or sibling analyzeFixturePlanUpload)
        │
        ├── Store L×W found (current behaviour)
        │     └── Optional: "Use generic generate" (packer) — unchanged
        │
        └── Fixture annotations / scale found
              ├── Show scale source (1:50, scale bar, dimension string)
              ├── Show parsed runs table (type, length, depth, bays, confidence)
              ├── User confirms / edits envelope if derived from geometry bounds
              └── Create layout → API builds aisles + shelves from import model
                        │
                        ▼
              Editor: optional underlay for alignment; user may nudge shelves
                        │
                        ▼
              Smart Generate / planogram fill (products) — existing flows
```

**FR-UX-01:** User must **never** be forced to re-upload; switching between “envelope only” and “fixture import” is explicit when both signals exist.

**FR-UX-02:** All parsed values show **unit** (m / mm) and **source** (text / OCR / manual).

---

## 7. Functional requirements

### Epic A — Scale and coordinates

| ID | Requirement | Acceptance (Given / When / Then) |
|----|-------------|-------------------------------------|
| FR-SCALE-01 | Parse drawing scale `1:N` from text. | Given PDF text contains `Scale 1:50`, when analyzed, then `metersPerDrawingUnit` is consistent with 1:50 definition used in architecture (document conversion in implementation notes). |
| FR-SCALE-02 | Parse explicit mm dimensions on plan. | Given text `1500` adjacent to aisle label context, when parsed, then aisle width suggestion = **1.5 m** (with confidence). |
| FR-SCALE-03 | Derive store bounds when L×W absent. | Given ≥3 consistent length strings and scale, when envelope not in text, then suggest `widthMeters` / `depthMeters` from **bounding box of fixture runs** + margin; user confirms. |
| FR-SCALE-04 | Scale bar on raster. | Given PNG with scale bar segment labelled 0–5 m, when OCR/vision phase enabled, then propose scale with confidence; if low, require manual scale entry. |

### Epic B — Fixture annotation parsing

| ID | Requirement | Acceptance |
|----|-------------|------------|
| FR-FIX-01 | Ambient length labels. | `AMBIENT 9m`, `AMBIENT 4.5m` → run type **gondola/ambient**, length metres. |
| FR-FIX-02 | Depth phrases. | `250mm deep`, `3750` (mm context) → shelf depth metres. |
| FR-FIX-03 | Bay / shelf counts. | `4 BAYS 5 SHELVES` → `bayCount`, `defaultLevels` or segment model alignment. |
| FR-FIX-04 | Door / bay refrigeration. | `6 DOORS 3 BAYS` → fixture type **multideck/chiller** mapping table; length from model line or adjacent mm. |
| FR-FIX-05 | Equipment keywords. | `KALEA FREEZE` vs `KALEA CHILLED` → freezer vs chiller template; unknown → **generic** + warning. |
| FR-FIX-06 | Ignore low-value text. | Title blocks, grid bubbles, handwritten noise → not emitted as fixtures; listed under `warnings[]`. |

### Epic C — Layout generation

| ID | Requirement | Acceptance |
|----|-------------|------------|
| FR-GEN-01 | Emit aisles. | Imported plan with parallel runs generates **aisle centrelines** with width ≥ `minAisleWidthMeters` from layout settings. |
| FR-GEN-02 | Emit shelves. | Each parsed run maps to ≥1 **shelf** record with `usableWidthMeters`, `depthMeters`, `heightMeters` (default ceiling/level rules), `fixtureTypeId` from mapping table. |
| FR-GEN-03 | Pairing / double-sided. | Back-to-back blocks in drawing (double gondola) map to **pairId** where appropriate (see existing gondola pair semantics). |
| FR-GEN-04 | Obstacles / BOH. | Regions labelled stairs, lift, store room → **obstacles** or hole in fixture zone (configurable in P3). |
| FR-GEN-05 | No wipe on autofill. | `fillPlanogram` and Smart Generate **must not** delete imported shelf geometry unless user opts into “regenerate layout”. |
| FR-GEN-06 | API contract. | POST `/layouts` accepts extended `floorPlanImport` payload (§8); returns shelves/aisles count in `generated` / `importSummary`. |

### Epic D — Quality & operations

| ID | Requirement | Acceptance |
|----|-------------|------------|
| FR-QA-01 | Deterministic tests. | Parser unit tests use **fixed text fixtures** extracted from Layout1/Layout2 (no binary OCR in CI for P1). |
| FR-QA-02 | Import summary persisted. | `layout.importSource` extended with `fixtureImport: { scale, runCount, warnings, parserVersion }`. |
| FR-QA-03 | Feature flag. | `PLAN_FIXTURE_IMPORT_ENABLED` or reuse autogenerate flag pattern for safe rollout. |

---

## 8. Proposed data contract (draft)

Extend existing `floorPlanImport` object on **POST `/layouts`** (OpenAPI update required after approval):

```json
{
  "floorPlanImport": {
    "sourceFileName": "Layout2.png",
    "sourceType": "image",
    "dimensionSource": "scale",
    "matchedText": "Scale 1:50",
    "pageIndex": 0,
    "importMode": "fixture",
    "scale": {
      "method": "text_scale_notation",
      "ratio": 50,
      "metersPerPixel": null
    },
    "storeEnvelope": {
      "widthMeters": 0,
      "depthMeters": 0,
      "derivedFrom": "fixture_bounds",
      "userConfirmed": true
    },
    "runs": [
      {
        "id": "run-1",
        "label": "AMBIENT 9m",
        "kind": "ambient_gondola",
        "lengthMeters": 9,
        "depthMeters": 0.6,
        "bayCount": 4,
        "levelCount": 5,
        "confidence": 0.92,
        "geometry": { "centerXMeters": 12, "centerYMeters": 8, "rotationDeg": 0 }
      }
    ],
    "aisleHints": [{ "widthMeters": 1.5, "source": "1500 mm" }],
    "warnings": ["checkout_area_not_imported"]
  },
  "autoGenerateFixtures": false
}
```

When `importMode` is `fixture` and `runs` is non-empty, server **skips generic packer** and builds from `runs` (+ aisle graph). When `importMode` is `envelope` or absent, **current behaviour** applies.

**Client note:** P1 may send only file bytes to a new **`POST /layouts/analyze-plan`** endpoint if parsing moves server-side for OCR; alternatively extend client analyze and POST structured runs. **Decision in §10 Q3.**

---

## 9. Technical approach (high level)

### 9.1 Parser layers

| Layer | Input | Output |
|-------|--------|--------|
| L1 Text | PDF `getTextContent`, SVG text, filename | Strings + positions (if available) |
| L2 OCR | PNG raster | Text + bounding boxes (Phase P2) |
| L3 Grammar | Token stream | Typed `FixtureRun`, `AisleHint`, `ObstacleHint` |
| L4 Scale | Scale bar + 1:N + mm strings | `metersPerPixel` / world bounds |
| L5 Geometry | Text positions + Hough/rect detection OR PDF paths | Run centreline, rotation, order |
| L6 Map | FixtureRun[] | `aisles[]`, `shelves[]` via fixture catalog defaults |

New shared module (proposed): `codebase/shared/floorPlanFixtures.mjs`  
New API service (proposed): `codebase/api/src/services/planFixtureImport.js`

### 9.2 Mapping to existing models

- **Shelf:** `usableWidthMeters` ← run length; `depthMeters` ← parsed depth or template default; `defaultLevels` / `levels[]` ← shelf count; `categoryId` unset until Smart Generate or manual assign.
- **Aisle:** derive from parallel run pairs and `aisleHints`; reuse `aisleBinding` / labelling after placement.
- **Fixture types:** extend mapping table in `fixtureCatalog.js` / `categoryFixtureDefaults.js` for FREEZE/CHILLED keywords.

### 9.3 Relationship to current code

| Component | Role today | Change |
|-----------|------------|--------|
| `web/src/floorPlanImport.js` | Store dimensions from text/aspect | Add fixture parse hook or delegate to API |
| `web/src/modules/LayoutCreateModal.jsx` | Upload UI | Preview table, import mode, confirm envelope |
| `shared/floorPlanDimensions.mjs` | L×W regex | Keep; add mm-only and scale patterns |
| `api/src/routes/layouts.js` | `floorPlanImport` → polygon + autogenerate | Branch: fixture import builder |
| `api/src/services/layoutPacker.js` | Generic grid pack | **Not used** when fixture import succeeds |
| `api/test/floor-plan-import.test.js` | Envelope import tests | Add fixture JSON fixtures |

---

## 10. Open questions (review required)

| # | Question | Options | Recommendation |
|---|----------|---------|----------------|
| Q1 | PNG-first (samples) vs PDF-first? | OCR cost vs client PDF text | **PDF text first** in P1; **OCR for PNG** in P2 using Layout1/2 as QA |
| Q2 | Pixel-perfect underlay required? | Yes / optional / no | **Optional** underlay for alignment; geometry from parsed positions |
| Q3 | Parse client-side vs `POST /analyze-plan`? | Client pdf.js vs server OCR | **Hybrid:** keep pdf.js text on client; **server** for OCR and heavy geometry |
| Q4 | Checkouts & food service | Obstacles / ignore / fixture type “service” | **Ignore v1**; obstacle rectangles **v2** |
| Q5 | User edit granularity | Edit runs table vs canvas-only | **Runs table + drag in editor** |
| Q6 | Failure fallback | Block create vs packer fallback | **Warn and offer packer fallback** if zero runs parsed |
| Q7 | Category assignment on import | None / infer from AMBIENT VEG / zone labels | **None v1**; pass labels as `suggestedCategoryName` optional field |
| Q8 | Max plan size / performance | 12 MB upload limit today | Keep; timeout budget for OCR TBD |

**Reviewers:** decisions locked in `openspec/changes/plan-fixture-import/REVIEW.md` (2026-09-17).

---

## 11. Non-functional requirements

- **NFR-1:** P1 parser (text only) completes in **< 2 s** on typical PDF on dev hardware.
- **NFR-2:** Import must be **idempotent** given the same file + confirmed scale (stable shelf IDs or deterministic regen policy documented).
- **NFR-3:** No external OCR API call in **offline/demo** mode unless configured (env-gated).
- **NFR-4:** Parsed geometry and warnings logged with `layoutId` for support (align with observability skill if extended).

---

## 12. Acceptance test scenarios (QA)

| # | Scenario | Steps | Expected |
|---|----------|-------|----------|
| AT-1 | Layout2 scale | Upload Layout2.png, confirm 1:50 | Scale method recorded; envelope suggested |
| AT-2 | Ambient lengths | Parse `AMBIENT 9m` / `10m` | Two runs, lengths 9 and 10 m |
| AT-3 | mm conversion | Parse `3750` chiller context | Depth/length 3.75 m where applicable |
| AT-4 | Create layout | Confirm import, create | aisles.length > 0, shelves.length > 0 |
| AT-5 | Editor | Open 2D | Fixtures visible; optional underlay aligns ~5% |
| AT-6 | Regression | Upload file with only `28m x 17m` text | Existing envelope + packer path unchanged |
| AT-7 | Planogram | Smart Generate products on imported layout | Products fill without removing shelves |

---

## 13. Implementation checklist (post-approval)

- [x] Review sign-off on §10 — `openspec/changes/plan-fixture-import/REVIEW.md`
- [x] OpenSpec change folder + delta spec — `openspec/changes/plan-fixture-import/`
- [ ] Update `Docs/openapi.yaml` for `floorPlanImport` extension and optional analyze endpoint
- [ ] Implement `floorPlanFixtures.mjs` + tests from Layout1/2 text extracts
- [ ] Implement `planFixtureImport.js` + API branch in `layouts.js`
- [ ] Extend `LayoutCreateModal` preview UX
- [ ] QA on `Docs/plan/Layout1.png` and `Layout2.png`
- [ ] Update `FLOOR_PLAN_IMPORT_SPEC.md` cross-link and `HANDOVER.md`

---

## 14. Glossary

| Term | Meaning |
|------|---------|
| **Run** | A labelled fixture segment on the plan (one ambient side, one chiller bank, etc.) |
| **Envelope** | Store `widthMeters` × `depthMeters` outer boundary |
| **Fixture import** | Building aisles/shelves from parsed runs instead of generic packer |
| **Packer** | Existing `layoutPacker.js` / Smart Generate grid fill |

---

## 15. Document history

| Date | Change |
|------|--------|
| 2026-09-17 | Initial draft from demo feedback; sample plans in `Docs/plan/` |

---

**Runtime flag (API):** set `PLAN_FIXTURE_IMPORT_ENABLED=true` to activate fixture import on POST `/layouts` (default off).

*Next step: **SEED-PI-08** (geometry) and **SEED-PI-09** (PNG OCR); then **SEED-PI-10** validation/handover.*
