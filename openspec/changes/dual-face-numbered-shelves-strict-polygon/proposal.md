# Proposal: Dual-face numbered shelves + strict drawn area

**Status:** Implemented (2026-07-16)

## Summary

Extend layout generation and the 2D canvas so that:

1. **Drawn polygon = exclusive fixture zone** — aisles and shelves only inside the user-drawn boundary; canvas viewport matches the drawn area (not the full layout rectangle).
2. **Dual-sided shelves** — gondola-style units support **Face A** and **Face B**, each with its own category and planogram.
3. **Numbered shelves, no type labels** — replace `"shelf"` / `"gondola"` text on canvas with **display numbers**; each number (and A/B suffix) identifies the category assignment for that face.
4. **Strict placement** — if a shelf or aisle does not fully fit inside the drawn area, **leave blank** (no overflow outside the dashed line).

Builds on partial containment work already in the codebase (grid sampling packer); this change completes **visual strictness** and adds **dual-face merchandising**.

## Deliverables

### 1. Strict drawn-area canvas

- Floor canvas **clips and sizes** to the polygon AABB; exterior of polygon within the layout rectangle is **dimmed / non-interactive**.
- Grid and autogenerate operate **only** inside the polygon.
- `widthMeters` / `depthMeters` remain metadata; **authoritative fixture boundary = polygon**.

### 2. Dual-face shelf model

New shelf fields (API + OpenAPI):

| Field | Purpose |
|-------|---------|
| `displayNumber` | Integer shown on canvas (e.g. `12`) |
| `doubleSided` | `true` for gondola / autogen rows facing both sides |
| `faces[]` | `{ id: "A"\|"B", categoryId, color, planogram[] }` |

Legacy single `categoryId` + `planogram[]` remain for backward compatibility; normalized to `faces[0]` when `faces` absent.

### 3. Canvas labeling

- **Remove** fixture type text (`shelf`, `gondola`, planogram count).
- **Show** category number: `12` (single-sided) or `12A` / `12B` (dual-sided, split visually on the fixture).
- **Color** from category mapping (existing); number is primary identifier.

### 4. Smart autogen updates

- Assign sequential `displayNumber` per generated shelf (1…N).
- For **double-sided** types (gondola default): assign **category mix per face** (Face A / Face B can differ or mirror row category).
- Skip placement when footprint not fully inside polygon (existing rule, enforced in packer + UI).

### 5. Merchandising UI

- Merchandising tab: select **Face A | Face B** when shelf is double-sided.
- Planogram pickers scoped to that face's category.

## SEED units

| ID | Scope |
|----|-------|
| SEED-DF-00 | Shelf schema: displayNumber, faces[], OpenAPI v0.7 |
| SEED-DF-01 | Strict polygon canvas (viewport, dim exterior, clip) |
| SEED-DF-02 | Numbered shelf badges (remove type labels) |
| SEED-DF-03 | Dual-face autogen + category mix per face |
| SEED-DF-04 | Merchandising dual-face planogram UI |
| SEED-DF-05 | Packer normalization + containment hardening |
| SEED-DF-06 | Tests, spec fold, handover |

## Success criteria

- Draw irregular polygon → generate → **zero** shelves/aisles outside dashed line; blank where no fit.
- Canvas **does not** show full rectangle grid outside polygon.
- Shelves show **numbers** (not `"shelf"`); dual gondolas show **A/B** with distinct category colors.
- Planogram can place products on Face A and Face B independently.
- All existing tests pass + new dual-face and strict-polygon tests.

## Relationship to recent work

| Prior change | Relationship |
|--------------|--------------|
| module-reframe-smart-autogen | Smart generate + category mix — **extend** for face A/B |
| merch-layers-polygon-fix | Containment packer — **complete** canvas strictness |
| In-flight code (Jul 2026) | Grid sampling packer — **baseline**; fold into SEED-DF-05 |

See [REVIEW.md](./REVIEW.md) for decisions.
