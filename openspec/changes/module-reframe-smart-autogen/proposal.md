# Proposal: Module reframe + smart category autogen

**Status:** Implemented (2026-07-16)

## Summary

Reorganize ShelfPilot **by module** so each menu item has one clear job. Move the layout portfolio and “New layout” action from Dashboard into **Layouts**. Turn **Dashboard** into an analytics-style home. Replace the 3-step wizard with a **single create form** including **Store type** (Hypermarket, Pharmacy, etc.). Upgrade autogenerate to accept **aisle space** and **category mix sliders** (e.g. Vegetables 50%, Chilled 20%) and produce **category-pre-mapped shelves**, including **chilled** zones.

## Deliverables

### 1. Module-wise navigation & shell

- Sidebar items with **emoji + icon + label** (see design.md).
- Remove layout list from Dashboard; add **Layouts** as first-class module.
- Top **vertical pill bar** optional on Catalog/Admin only (store type set per layout on create).

### 2. Dashboard (analytics home)

- KPI cards: utilization %, layout count, total shelves, mapped categories.
- Mini chart: category allocation (from latest or selected layout).
- “Recent layouts” strip (last 5) with link → open in Layouts module.
- No “New layout” button here.

### 3. Layouts module (portfolio + editor)

**Portfolio view** (default when entering Layouts):
- Same card grid + status filters as today’s Dashboard.
- **+ New layout** opens **single form** (not steps).

**Single create form fields:**

| Field | Control | Notes |
|-------|---------|-------|
| Store name | text | required |
| **Store type** | dropdown | Hypermarket, Supermarket, Pharmacy, Beauty, Apparel, Convenience |
| Width / depth / height | number | meters |
| Initial floor shape | radio | Rectangle (default) — irregular drawn in canvas after open |

On submit → create layout → navigate to **canvas editor** for that layout.

**Canvas view** (existing LayoutEditor, embedded in Layouts module):
- Back link → portfolio
- Draw area, generate, merchandising tab, 2D/3D (unchanged from CM-v2)

### 4. Smart autogenerate (category-aware)

Replace simple “Generate” dialog with **Smart generate** panel:

| Input | Control |
|-------|---------|
| Min aisle width | number (m) — “aisle space” |
| Orientation | auto / horizontal / vertical |
| **Category mix** | sliders per store-type template (sum = 100%) |

**Example — Hypermarket mix:**

| Category zone | Default % | Shelf tag |
|---------------|-----------|-----------|
| 🥬 Fresh produce / Vegetables | 25% | ambient |
| 🛒 Grocery / Dry goods | 30% | ambient |
| 🧊 **Chilled** (dairy, deli) | 20% | **chilled** |
| ❄️ **Frozen** | 10% | **frozen** |
| 🏷️ Promotional / Seasonal | 15% | ambient |

**Example — Pharmacy mix:**

| Zone | Default % |
|------|-----------|
| OTC | 40% |
| Prescription (Rx) | 15% |
| Vitamins | 20% |
| Personal care | 15% |
| **Chilled** (vaccines / cold chain demo) | 10% |

On **Generate**:
1. Pack aisles/shelves inside polygon (existing packer).
2. Assign each shelf a **categoryId** and **color** by mix proportions.
3. Set `temperatureZone` on shelf: `ambient` | `chilled` | `frozen` where applicable.
4. User can still adjust in Merchandising tab.

### 5. Catalog additions (chilled)

- Seed/demo categories: **Chilled**, **Frozen**, **Fresh produce** per store type.
- Products tagged for chilled facings (demo SKUs).

### 6. API / data model (delta)

`POST /layouts/{id}/autogenerate` body extended:

```json
{
  "replaceExisting": true,
  "minAisleWidthMeters": 1.5,
  "orientation": "auto",
  "categoryMix": [
    { "categoryId": "fresh-produce", "percent": 25, "temperatureZone": "ambient" },
    { "categoryId": "chilled", "percent": 20, "temperatureZone": "chilled" }
  ]
}
```

New optional shelf fields: `temperatureZone`, autogen-assigned `categoryId` + mapping.

## SEED units (implementation order)

| ID | Scope |
|----|-------|
| SEED-MR-00 | Module routes + emoji nav shell |
| SEED-MR-01 | Dashboard analytics home |
| SEED-MR-02 | Layouts portfolio + single-form create |
| SEED-MR-03 | Store type registry (Hypermarket etc.) |
| SEED-MR-04 | Smart generate UI (sliders + aisle space) |
| SEED-MR-05 | Category-aware packer + API |
| SEED-MR-06 | Chilled/frozen categories + demo seed |
| SEED-MR-07 | Tests, OpenAPI, handover |

## Success criteria

- Dashboard shows analytics KPIs; no layout grid primary.
- Layouts module shows portfolio + single-form create with Store type dropdown.
- Smart generate with 50% vegetables (example) yields ~50% of shelves mapped to produce category.
- Chilled shelves visible in 2D (e.g. blue tint) and listed in Merchandising.
- All 25+ existing tests pass; new tests for category-mix autogen.

## Decisions for your review

See [REVIEW.md](./REVIEW.md).
