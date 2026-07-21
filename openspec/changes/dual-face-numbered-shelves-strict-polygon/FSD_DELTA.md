# FSD delta — dual-face-numbered-shelves-strict-polygon

**Apply to `Docs/FSD_ShelfPilot.md` after approval** (new section **5f** + edits below).

---

## New section 5f — dual-face-numbered-shelves-strict-polygon (2026-07-16)

**OpenSpec change:** `openspec/changes/dual-face-numbered-shelves-strict-polygon/`  
**SEED series:** SEED-DF-00 … SEED-DF-06 (`Docs/seeds/SEED-DF-*.md`)

Completes strict **drawn-area** behavior for aisles/shelves: canvas viewport matches polygon (not full layout rectangle). Shelves show **display numbers** (not type labels); gondolas support **Face A / Face B** with independent category and planogram. Smart autogenerate assigns numbers and face categories from mix. OpenAPI **v0.7.0**.

---

## Epic edits

### Epic C — Layout Editor (C1) — **MODIFIED**

| ID | Requirement |
|----|-------------|
| **C1a** | 2D canvas **strict polygon viewport**: stage sized to polygon AABB; exterior dimmed; grid/placement only inside drawn line. |
| **C1b** | Shelf badges show **displayNumber** (`12`, `12A`, `12B`); **no** fixture type text on canvas. |
| **C1c** | Shelf number **legend** maps number (+ face) → category name. |

### Epic F3 — Polygon draw, rules autogen — **EXTENDED**

| ID | Requirement |
|----|-------------|
| **A2b** | Drawn polygon = **exclusive fixture zone** (aisles + shelves only); blank where footprint does not fit. |
| **A3b** | Autogenerate assigns `displayNumber` 1…N; gondolas get `doubleSided: true` with `faces[]`. |
| **A3c** | Category mix may assign **different categories** to Face A and Face B on the same gondola. |
| **AC** | Given irregular polygon, When Generate, Then zero fixtures outside dashed boundary and canvas does not show full-rectangle empty grid. |
| **AC** | Given gondola #12, When viewing 2D, Then `12A` and `12B` visible with distinct category colors. |

### Epic F4 — Planogram (M4) — **EXTENDED**

| ID | Requirement |
|----|-------------|
| **M4b** | Merchandising panel: **Face A \| Face B** tabs on double-sided shelves; planogram scoped per face. |
| **AC** | Given Face B = Chilled, When placing product on Face B, Then product must be in Chilled subtree. |

---

## User flow (extend §8 item 1)

… → draw/adjust **fixture zone** polygon → Smart generate (numbers + A/B faces assigned) → select shelf → Merchandising **Face A or B** → place products by level → 2D shows **numbers only** …

---

## Traceability (add to matrix)

| SEED | Epic |
|------|------|
| SEED-DF-00 | C1, M4, OpenAPI |
| SEED-DF-01 | C1a, A2b |
| SEED-DF-02 | C1b, C1c |
| SEED-DF-03 | A3b, A3c |
| SEED-DF-04 | M4b |
| SEED-DF-05 | A2b |
| SEED-DF-06 | All |
