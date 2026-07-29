# Proposal: Gondola runway placement — fix duplicate aisles & front/back shelf visibility

**Status:** Draft — rethink required before further code changes  
**Date:** 2026-07-28  
**Source:** Layout editor QA — Smart Generate shows two aisles stacked in the same area; gondola racks do not clearly show two shelves (front A1 / back A2).

**Methodology reference:** [Docs/Standard Methods for Store Layout Design.md](../../Docs/Standard%20Methods%20for%20Store%20Layout%20Design.md) — fixtures are placed on a measured grid with **adjacency rules** (walk corridor → fixture → walk corridor), not arbitrary overlapping rectangles.

**Supersedes / amends:** Partially revises CF-11/CF-12 from [layout-client-feedback](../layout-client-feedback/proposal.md) — the *intent* (dual-face gondola toward opposite aisles) remains; the *packing algorithm and canvas model* need correction.

---

## Problem statement

After Smart Generate (or refresh in the layout editor), users report:

| Symptom | User expectation |
|---------|------------------|
| **Two aisles appear in the same area** (overlapping or stacked grey bands) | One **walk corridor** between fixture rows — not duplicate aisle entities |
| **Racks do not show two shelves** (front + back) | Each gondola unit visibly shows **A1 (front)** and **A2 (back)** merchandising faces toward opposite aisles |
| Toast/counts like “2 aisles” feel wrong | Counts distinguish **gondola units** (fixture pairs) from **walk aisles** (corridors) |

This blocks trust in autogenerate and makes manual merchandising confusing.

---

## Root cause analysis (current implementation)

### RC-1 — Aisle generation runs in three independent passes

`layoutPacker.js` creates aisles from:

1. **`packGondolaBandHorizontal` / `packGondolaBandVertical`** — scans a walk aisle **before** and **after** each gondola row (`scanHorizontalAisles` / `scanVerticalAisles`).
2. **`packRegion` loops** — stacks multiple bands; the **south aisle of band N** and **north aisle of band N+1** are intended to be the **same physical corridor** but are emitted as **separate aisle entities** unless `aisleNearDuplicate()` rejects them (tolerance: `0.5 × minAisleWidth`, same orientation, similar x/y/w/d).
3. **`fillCrossCorridors(orient)`** — after all bands, adds a **grid** of perpendicular aisles (horizontal scan lines + vertical scan lines) for mixed/auto layouts. These often **duplicate** aisles already created in step 1–2 at the same coordinates.

**Result:** Small and medium layouts frequently persist **2+ aisle records** whose footprints overlap or sit on the same band — visually “two aisles in one place”.

### RC-2 — Shelves skipped but aisles still emitted

A gondola band requires minimum depth:

```
minAisle + gap + shelfDepth + gap + minAisle  (+ margins)
```

If the fixture polygon is shallow (common on first draw), **`packGondolaBand*` returns early** after scanning aisles but **before or after** placing shelf pairs. The canvas then shows **walk aisles only** — user interprets this as “two aisles, no racks”.

### RC-3 — Front/back pair data model vs canvas model mismatch

CF-12 introduced **two physical shelf entities** per gondola (`pairId`, `pairRole: front|back`) sharing one floor AABB via `oppositeShelfOrigin()` (+180° rotation).

| Layer | Behaviour | Issue |
|-------|-----------|-------|
| **API / packer** | Creates front + back as separate shelves | Correct for move/delete sync |
| **2D canvas (merged view)** | Hides back shelf; merges to one div with A1\|A2 split | Works **only if** `pairId` + `pairRole` survive autogen pipeline |
| **Category mix / fixture typing** | `applyFixtureTypesToShelves` may re-normalize shelves | Risk of breaking pair metadata or collapsing to single-face |
| **User mental model** | “2 shelves in the rack” | Sees either one rectangle or two grey aisles — not a labelled gondola unit |

When merge preconditions fail, users see **one shelf** or **nothing** between aisles.

### RC-4 — Terminology overload: “aisle” vs “gondola face”

Toast and palette copy use **“aisles + shelves”**. In retail:

- **Walk aisle** = customer path (grey band on canvas).
- **Gondola unit** = one fixture with **Face A1** (front) and **Face A2** (back) toward **opposite** walk aisles.

Users conflate autogen’s two walk corridors with “two aisles instead of two shelf faces”.

---

## Target retail model (locked for this fix)

### Gondola runway (plan view)

One **runway** = a repeating strip:

```
┌─────────────────────────────────────────────┐
│  WALK AISLE  (one entity, full run length)  │
├─────────────────────────────────────────────┤
│ [A1][A1][A1]…  gondola row (front faces)   │  ← one physical row of pairs
│ [A2][A2][A2]…  (back faces toward aisle below)│
├─────────────────────────────────────────────┤
│  WALK AISLE  (shared boundary — deduped)    │
└─────────────────────────────────────────────┘
```

Rules:

1. **One walk-aisle entity per corridor centreline** — never two records for the same corridor.
2. **One gondola unit = one `pairId`** with front shelf (A1) + back shelf (A2); shared `displayNumber` letter (A, B, C…).
3. **A1 faces the walk aisle above; A2 faces the walk aisle below** (horizontal runways; analogous for vertical).
4. **Category mix percentages apply per gondola unit**, not per physical shelf entity.
5. **`fillCrossCorridors` is opt-in** (mixed layout + large floor) — not default for horizontal/vertical single-orientation packs.

### Canvas rendering rules

| Entity | Render as |
|--------|-----------|
| Walk aisle | Grey band, label “Walk aisle N”, dashed border |
| Gondola unit (pair) | **Single** fixture footprint, vertical spine, **A1 \| A2** colour split, edge digits 1 / 2 |
| Selected gondola | Optional ghost of back shelf or highlight both pair members in Properties |

### Counts / toast

`Generated 4 gondolas (A1+A2) · 3 walk aisles` — never `8 shelves · 3 aisles` without explanation.

---

## Proposed deliverables

| ID | Deliverable | Summary |
|----|-------------|---------|
| CF-16 | **Runway packer v2** | Single-pass aisle emission with boundary sharing + collinear merge; remove default `fillCrossCorridors` |
| CF-17 | **Compact layout mode** | If full runway doesn’t fit, place gondola pairs **without** flanking aisle entities (implicit walk gap) OR skip aisles until depth allows shelves |
| CF-18 | **Gondola unit canvas** | Stable A1/A2 split regardless of pair merge; facing ticks toward nearest walk aisle |
| CF-19 | **Pipeline integrity** | Autogen → category mix → fixture typing preserves `pairId` / `pairRole`; regression tests |
| CF-20 | **Copy & legend** | Palette, toast, Smart Generate hint, shelf legend aligned to runway vocabulary |
| CF-21 | **Role-based UI gating** | Hide nav modules and pages users cannot access; Approver sees Admin audit only |

---

## CF-21 — Role-based navigation (summary)

Users must not see menu items or pages their role cannot use (API already returns 403).

| Module | Viewer | Designer | Approver | Admin |
|--------|--------|----------|----------|-------|
| Dashboard | ✓ | ✓ | ✓ | ✓ |
| Layouts (view) | ✓ | ✓ | ✓ | ✓ |
| Layouts (edit) | — | ✓ | — | ✓ |
| Products (view) | ✓ | ✓ | ✓ | ✓ |
| Products (edit/import) | — | ✓ | — | ✓ |
| Analytics | ✓ | ✓ | ✓ | ✓ |
| Admin | — | — | Audit only | Full |

Direct URL to forbidden page → redirect to first allowed module.

See [design.md](./design.md) §11 and `codebase/web/src/rolePermissions.js`.

---

## Success criteria

1. Autogenerate on a **12×8 m** rectangle with default min aisle → **≥1 gondola unit** visible with **A1 and A2** labels; **no overlapping aisle footprints** (IoU = 0 between distinct aisle ids).
2. Autogenerate on **20×15 m** polygon → multiple runways; **aisle count ≤ band boundaries + cross-aisles explicitly enabled** (not 2× from duplication).
3. Select gondola on canvas → Properties shows **Front (A1)** and **Back (A2)** with independent categories when mapped.
4. API tests: pair integrity after autogen + category mix; aisle dedup; no shelf-less double-aisle layouts for minimum-size fixture zones.
5. 3D walk view: products on A1 and A2 sides of same unit toward opposite corridors.
6. **Viewer** sees no Admin nav; **Approver** sees Admin with Audit tab only; direct `/admin` URL redirects for Viewer.

---

## Non-goals

- AI planogram placement (covered by layout-autogen-planogram-fill).
- Removing walk aisles entirely from large hypermarket layouts.
- Reverting to single `doubleSided: true` entity (keep two physical shelves for move/delete — fix presentation and packing only).

---

## Relationship to prior changes

| Change | Relationship |
|--------|--------------|
| layout-client-feedback CF-11/CF-12 | Intent kept; packing/rendering corrected |
| layout-autogen-planogram-fill | Planogram fill depends on stable pair faces — blocked until CF-19 |
| layout-merch-aisles-storage-faces | Aisle visibility styling remains; dedup fixes root overlap |
| shelf-face-letter-number-labels | A1/A2 labelling — apply at gondola unit level |

See [design.md](./design.md) for algorithm and data-model detail, [tasks.md](./tasks.md) for implementation checklist.
