# FSD delta — module-reframe-smart-autogen

**Apply to `Docs/FSD_ShelfPilot.md` after approval** (new section **5e** + edits below).

---

## New section 5e — module-reframe-smart-autogen (2026-07-16)

**OpenSpec change:** `openspec/changes/module-reframe-smart-autogen/`  
**SEED series:** SEED-MR-00 … SEED-MR-07 (`Docs/seeds/SEED-MR-*.md`)

Reframes the app **by module**: Dashboard becomes analytics home; layout portfolio and create move to **Layouts**; 3-step wizard becomes **single-form create** with **Store type** dropdown; navigation uses **emoji + label**; autogenerate becomes **smart category mix** (sliders, aisle space, chilled/frozen zones).

---

## Epic edits (replace / extend)

### Epic B — Dashboard (F2) — **MODIFIED**

| ID | Requirement |
|----|-------------|
| **B1** | Analytics home: KPI cards (utilization, layout count, shelf count, mapped categories), category allocation summary chart, recent layouts strip (links to Layouts canvas). **No** primary layout portfolio grid. |
| **B2** | ~~Guided 3-step wizard~~ **Moved to Epic B2-LAY (Layouts module).** |
| **AC** | Given authenticated Designer, When opening Dashboard, Then KPIs and charts are visible and portfolio grid is not the primary view. |

### Epic B2-LAY — Layouts module (NEW)

| ID | Requirement |
|----|-------------|
| **L1** | Layout portfolio: status filters, project cards, **+ New layout** action (content previously on Dashboard). |
| **L2** | **Single-form create**: store name, **Store type** dropdown (Hypermarket, Supermarket, Pharmacy, Beauty, Apparel, Convenience), W×D×H, initial floor shape → create draft → open canvas. |
| **L3** | Canvas editor embedded in Layouts module (existing LayoutEditor + Merchandising from CM-v2). |
| **AC** | Given Designer on Layouts portfolio, When clicking New layout and submitting form, Then draft layout opens in canvas without multi-step wizard. |

### Epic C — Layout Editor — **unchanged scope**, **new entry path**

- Entry: Layouts module → open layout → canvas (not Dashboard wizard).

### Epic F3 — Polygon draw, rules autogen — **EXTENDED**

| ID | Requirement |
|----|-------------|
| **A3** | Rules-based generate **with optional category mix**: min aisle width, orientation, per-category **percent sliders** (sum 100%). Packer assigns `categoryId` and `temperatureZone` (`ambient` \| `chilled` \| `frozen`) on shelves. |
| **AC** | Given mix Fresh produce 50% / Grocery 50%, When smart generate, Then ~50% of shelves map to each category. |
| **AC** | Given mix includes Chilled 20%, When smart generate, Then ~20% of shelves are chilled-tagged and visually distinct in 2D. |

### Epic E — Products & Categories — **EXTENDED**

| ID | Requirement |
|----|-------------|
| **E3** | Demo/seed categories for **Fresh produce**, **Chilled**, **Frozen** per store type; products suitable for chilled facings. |

### Epic G — Analytics — **CLARIFIED**

| ID | Requirement |
|----|-------------|
| **G0** | **Dashboard** = summary KPIs; **Analytics module** = deep compare, export, drill-down (both remain; no duplicate portfolio). |

### Navigation (NEW — cross-cutting)

| Module | Nav | Primary job |
|--------|-----|-------------|
| 📊 Dashboard | M-DASH | Store performance at a glance |
| 🗺️ Layouts | M-LAY | Create, list, edit floor plans |
| 📦 Products | M-CAT | Categories & SKUs |
| 📈 Analytics | M-AN | Reports & compare |
| ⚙️ Admin | M-ADM | Config & users |

---

## User flow (replace §8 item 1)

1. Login → **Dashboard** (KPIs) → **Layouts** → **+ New layout** (single form, store type) → canvas → draw/adjust area → **Smart generate** (aisle space + category mix sliders) → refine in Merchandising → products on facings → 2D/Orbit/Walk 3D → submit → **Analytics** for compare.

---

## Traceability (add to matrix)

| SEED | Epic |
|------|------|
| SEED-MR-00 | Nav |
| SEED-MR-01 | B1 |
| SEED-MR-02 | L1, L2 |
| SEED-MR-03 | L2, H2 |
| SEED-MR-04 | A3 |
| SEED-MR-05 | A3 |
| SEED-MR-06 | E3 |
| SEED-MR-07 | All |
