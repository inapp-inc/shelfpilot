# Proposal: Shelf face labels — letter + face number (A1, A2, B1, B2)

**Status:** Approved / In progress — 2026-07-27

**Source:** Client feedback — dual-face shelves need distinct shelf numbers per face so each side can carry different products.

## Summary

Dual-face fixtures currently show numeric badges with A/B suffixes (`3A`, `3B`). Merchandisers think in **shelf row + face** terms: the first shelf is **A** with faces **A1** and **A2**; the next is **B1** / **B2**, and so on.

Each face is treated as its own identifiable shelf slot for category mapping, planogram placement, and legend lookup.

## Problem today

| Area | Current | Gap |
|------|---------|-----|
| Canvas badge | `3A` / `3B` | Letter suffix reads as "face id", not a distinct shelf number |
| Legend | `3A → Grocery` | Same — not aligned with A1/A2 mental model |
| Merchandising | "Face A \| Face B" | No face-specific shelf number in header or toggles |
| Properties | `#3` | Integer only; faces not surfaced |

## Deliverables

### 1. Label format (display)

- **Shelf unit letter** — derived from sequential `displayNumber` (1→A, 2→B, … 26→Z, 27→AA).
- **Face digit** — Face A → `1`, Face B → `2`.
- **Face label** — `{letter}{digit}` e.g. `A1`, `A2`, `B1`, `B2`.
- **Single-face** fixtures (legacy `doubleSided: false`) show `{letter}1` only.

Internal `displayNumber` integer is unchanged for ordering and API compatibility.

### 2. Shared helpers (API + web)

- `displayNumberToLetter(n)`, `shelfFaceLabel(displayNumber, faceId)`, `shelfUnitLabel(displayNumber)`.
- Used by canvas badge, legend, Properties, Merchandising, Planogram modal.

### 3. UI updates

- **ShelfBadge** — `A1` / `A2` split (replaces `3A` / `3B`).
- **ShelfNumberLegend** — one row per mapped face with `A1`, `A2`, …
- **Merchandising / Planogram** — face toggles and headers use face labels (`A1`, `A2`).
- **Properties** — unit letter + face list summary.

### 4. Face-scoped bay splits

- Bay `segments[]` stored **per face** (`faces[].segments`), not shared at shelf level.
- Planogram editor split/merge/drag applies only to the **active face** (A1 or A2).
- Legacy layouts: shelf-level `segments` migrate to Face A on load; Face B starts as one full bay.

## SEED units

| ID | Scope |
|----|-------|
| SEED-SL-01 | Label helpers + unit tests |
| SEED-SL-02 | Canvas badge + legend |
| SEED-SL-03 | Merchandising + Properties + Planogram headers |

| SEED-SL-04 | Face-scoped bay segments (API + planogram editor) |

## Success criteria

- Autogenerate 3 dual-face shelves → canvas shows **A1/A2**, **B1/B2**, **C1/C2**.
- Legend maps each face label to its category.
- Merchandising Face toggle reads **A1 | A2** (contextual to selected shelf).
- Split bays on **A1** → switch to **A2** → still one full bay (independent layouts).

## Non-goals

- Changing `displayNumber` storage type (stays integer).
- Separate physical shelf records per face.
- Renaming internal `faceId` values (`A` / `B`).

## Relationship to prior changes

| Prior change | Relationship |
|--------------|--------------|
| dual-face-numbered-shelves-strict-polygon | Face model + displayNumber assignment |
| layout-merch-aisles-storage-faces | Dual-face storage + merch UI — **extend labels** |
