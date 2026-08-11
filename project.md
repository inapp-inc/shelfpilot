# ShelfPilot — Graphical Store Layout Design & Planning

> A vertical-agnostic platform for designing, visualizing, and optimizing physical-store layouts in 2D and 3D.
> _Built by the Foundry (InApp)._

---

## 1. Overview

ShelfPilot is the interactive realization of the **Graphical Store Layout Design Solution** (BRD v1.1 + addenda). It lets store planners, merchandisers, category managers, and operations teams digitally design store layouts, define fixtures and aisles, map product categories to shelf locations, fill planograms with dimension-aware capacity, and render the result in interactive 2D and 3D — replacing manual spreadsheet/CAD-based workflows.

The solution is **configurable, not hard-coded**: the same platform serves Retail, Pharmacy, Beauty & Cosmetics, Apparel, Grocery, and (planned) **Warehouse** formats through configuration.

| | |
|---|---|
| **Source of truth** | BRD v1.1 + [Docs/BRD_ADDENDUM_DEMO_AUG_2026.md](./Docs/BRD_ADDENDUM_DEMO_AUG_2026.md) · [Docs/FSD_ShelfPilot.md](./Docs/FSD_ShelfPilot.md) |
| **UI mock** | [ui/ShelfPilot.dc.html](./ui/ShelfPilot.dc.html) · [ui/brand.md](./ui/brand.md) |
| **OpenSpec** | [openspec/project.md](./openspec/project.md) · `openspec/specs/**` |
| **Implementation** | `codebase/` (Express API + React/Vite web + SQLite + Docker) |
| **Status** | Demo / local MVP — actively iterating on customer demo feedback (Aug 2026) |

---

## 2. Business Objectives (from BRD)

| ID | Objective |
|---|---|
| BO-01 | Reduce store layout design/redesign time via a guided digital workflow |
| BO-02 | Improve space utilization & shelf capacity accuracy through auto-calculation |
| BO-03 | Standardize layout design across all store formats and verticals |
| BO-04 | Provide 2D/3D visuals for faster stakeholder review and approval |
| BO-05 | Enable data-driven category and product placement decisions |
| BO-06 | One configurable platform reusable across verticals, reducing IT cost |
| BO-07 | Provide analytics to continuously improve layout effectiveness |
| BO-08 *(addendum)* | Enable shoppers/customers to **find products** and navigate to aisle/shelf without editing layouts |

---

## 3. Module → Screen Mapping

| Module | BRD Description | ShelfPilot Screen |
|---|---|---|
| **M1** Store Setup, Canvas & Aisle Management | Store boundaries, dimensions, zones; aisle definition & validation; floor-plan import | **Layout Editor** + New layout / import |
| **M2** Shelving, Storage & Auto-Calculation | Fixtures with measurements; Smart Generate packer; temporary storage *(planned)* | **Layout Editor** (palette, capacity, Smart Generate) |
| **M3** Product & Category Management | Category hierarchy and product catalog | **Products & Categories** |
| **M4** Category Mapping & 2D/3D Visualization | Map categories; planogram; aisle-centric 2D/3D; Customer wayfinding *(planned)* | **Layout Editor** + planned Customer find UI |
| **M5** Analytics & Reporting | Utilization, capacity, category, version reports | **Analytics** / Dashboard |
| **M6** Administration & Configuration | Users, roles, master data, vertical / store-type configuration | **Admin & Config** |

**Flow:** M6 → M1 → M2 → M3 → M4 → M5. Customer (shopper) path: select layout → find product → aisle/shelf directions (no edit).

---

## 4. Screens & Features

### Login & Access Control
- Roles today: **Designer, Approver, Viewer, Admin**.
- **Planned:** **Customer** — full-screen find product / wayfinding only; can select layout; cannot edit.

### Dashboard
- Portfolio of store layout projects with status filters.
- Space utilization widgets and layout drill-down.

### Layout Editor (M1 + M2 + M4)
- Scaled canvas: rectangular and irregular/polygon floor plans.
- Fixture palette — shelves, racks, gondolas, storage; **temporary tables/pallets planned**.
- Aisle definition with min-width / accessibility validation.
- **Floor plan import** (PNG/PDF): read dimensions → build layout via Smart Generate (see `Docs/FLOOR_PLAN_IMPORT_SPEC.md`).
- **Smart Generate** + arrangement/volume summary accept gate.
- **Planogram editor:** multi-level, segment-aware; dimension-based facings / depth / stack; weight load caps.
- **Ctrl+click** shelf → move/resize; **Enter** exits; normal click opens planogram.
- **2D WebGL** floor + **3D** Orbit / Walk with product images.
- **Aisle-centric labels** (`4A`, `5A`, …). Selection/highlight must be **aisle-bound** (not whole gondola pair) — see addendum FR-AISLE-01/02 *(fix in progress)*.

### Products & Categories (M3)
- Hierarchical categories, product CRUD, Excel import, product images & dimensions.

### Analytics (M5)
- Space utilization, category allocation, facings, customizable widget board.

### Admin & Config (M6)
- Users & roles, store/vertical configuration, fixture templates, approval workflow, audit.

---

## 5. Recent delivery (Jul–Aug 2026)

| Area | Summary |
|------|---------|
| Floor plan import | Dimension extraction + analyze/build path; Docker `shared/` copy |
| Packer / Smart Generate | Leftover fill, aisle clear, no-overlap; auto-fill planograms |
| Stack height | Cap stacks by level clear height + clearanceMeters + layer gap |
| Shelf layout mode | Ctrl move/resize; Enter to finish; normal click → planogram |
| 3D images | Persistent texture cache; planogram → View in 3D shows images |
| Aisle labeling | Orientation-aware binding; single-letter shelf suffixes |
| Arrangement UI | Layout summary accept before merchandising |

Detail: [Docs/BRD_ADDENDUM_DEMO_AUG_2026.md](./Docs/BRD_ADDENDUM_DEMO_AUG_2026.md) · [Docs/DEMO_CHANGES_SUMMARY.md](./Docs/DEMO_CHANGES_SUMMARY.md) · [Docs/MY_CHANGES_EXPORT.md](./Docs/MY_CHANGES_EXPORT.md)

---

## 6. Agreed next (customer demo Aug 2026)

| ID | Requirement | Priority |
|----|-------------|----------|
| FR-AISLE-01/02 | Aisle-based selection & 3D corridors (not pair co-select) | Critical |
| FR-BUF-01 | 1 cm product buffer (0.5 cm each side) in fill math | High |
| FR-TEMP-01 | Temporary storage fixtures (table / pallet) | Medium |
| FR-CUST-01 | Customer role + full-screen find + directions | High |
| FR-VIEW-01 | Flat adjacent/opposite shelves viewing menu | High |
| FR-WH-01 | Warehouse store type (design workshop first) | Medium |

Full acceptance criteria: [Docs/BRD_ADDENDUM_DEMO_AUG_2026.md](./Docs/BRD_ADDENDUM_DEMO_AUG_2026.md).

---

## 7. Scope

**In scope:** store setup & canvas, floor-plan import, fixture definition, aisle validation, category/product management, planogram, 2D/3D, auto-calc / Smart Generate, analytics, administration, configuration; **Customer wayfinding** (planned); **Warehouse type** (planned after design).

**Out of scope:** POS integration, real-time inventory/stock, physical fixture procurement, structural engineering, foot-traffic sensors (future phase).

**Target verticals / types:** General Retail, Pharmacy, Beauty, Apparel, Grocery — extensible via configuration; **Warehouse** as a distinct type under design.

---

## 8. Stakeholders

| Role | Responsibility |
|---|---|
| Store Planning / Design Team | Create and edit layouts (Designer) |
| Category / Merchandising Managers | Categories and shelf mapping |
| Store Operations Managers | Review/approve, aisle compliance |
| Business / Vertical Admin | Vertical templates and rules |
| IT / System Admin | Users, system configuration |
| Analytics / BI Team | Reporting outputs |
| Executive Sponsors | High-level utilization |
| **Customer / Shopper** *(new)* | Find products; get aisle/shelf directions; no edit |

---

## 9. Assumptions & Constraints

- Store dimension data available at creation (manual or floor-plan import).
- Units of measure defined globally or regionally.
- Fixture/shelf catalog maintained as master data.
- Varying store shapes (rectangular + irregular polygon).
- Vertical-specific behavior via **configuration only**.
- 3D must run on standard business hardware.
- **Aisle binding** is the source of truth for shelf identity and shopper-facing selection — gondola `pairId` is a physical footprint link, not a single UI selection.

---

## 10. Acceptance Criteria (Summary)

- Create a layout by dimensions or floor-plan import → scaled canvas / generated fixtures.
- Place custom fixtures; aisle min-width violations flagged.
- Auto-calc / Smart Generate updates fixture placement; arrangement can be accepted.
- Categories map with color coding; planograms fill with dimension & load awareness.
- Layout navigable in 2D and 3D with products/images; aisle corridors visible in 3D.
- Selecting a shelf selects **only that aisle-facing unit**, not the opposite aisle’s pair.
- Analytics show utilization and category allocation accurately.
- Same system configures multiple verticals with no code fork.
- *(Planned)* Customer finds a product and is directed to aisle/shelf without edit access.

---

## 11. Design System & Branding

- **App name:** ShelfPilot
- **Attribution:** Built by the Foundry (InApp) — [ui/brand.md](./ui/brand.md)
- **Logo:** Crimson rounded-square mark (`#A30A2A`) + white icon + **ShelfPilot** wordmark
- **Colors:** Primary `#A30A2A`, gradient `#C4183A → #A30A2A`
- **Neutrals:** `#F0F0F0` background, `#1f2933` ink, `#6b7280` / `#9aa1ab` secondary text
- **Type:** Plus Jakarta Sans (UI), DM Mono (measurements/labels)
- **3D:** Three.js · **2D floor:** WebGL composite + DOM entities

---

## 12. Glossary

| Term | Definition |
|---|---|
| Fixture | Any shelf, rack, gondola, bin, temporary table/pallet, or storage unit |
| Facing | Number of product units presented on a shelf front |
| Aisle | Walkable pathway; shelves bind to the aisle they face |
| Vertical / store type | Store-format category (retail, pharma, beauty, apparel, warehouse…) |
| Category Mapping | Assignment of a product category to a physical shelf location |
| Auto-Calculation / Smart Generate | Rules packer computing fixture placement & optional planogram fill |
| Gondola pair | Two physical shelves sharing one footprint; each faces a **different aisle** |
| Product buffer | 1 cm total spacing reserved in capacity math (0.5 cm each side) |
| Customer role | Shopper persona: find product & navigate; no design rights |

---

_Derived from BRD v1.1, demo delivery Jul–Aug 2026, and [Docs/BRD_ADDENDUM_DEMO_AUG_2026.md](./Docs/BRD_ADDENDUM_DEMO_AUG_2026.md). Canonical OpenSpec copy: `openspec/project.md`._
