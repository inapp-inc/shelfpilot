# ShelfPilot — Graphical Store Layout Design & Planning

> A vertical-agnostic platform for designing, visualizing, and optimizing physical-store layouts in 2D and 3D.
> _Built by the Foundry (InApp)._

---

## 1. Overview

ShelfPilot is the interactive prototype realization of the **Graphical Store Layout Design Solution** defined in the BRD (v1.1). It lets store planners, merchandisers, category managers, and operations teams digitally design store layouts, define fixtures and aisles, map product categories to shelf locations, and render the result in interactive 2D/3D — replacing manual spreadsheet/CAD-based workflows.

The solution is **configurable, not hard-coded**: the same platform serves Retail, Pharmacy, Beauty & Cosmetics, Apparel, Grocery, and other physical-store formats through configuration only (see the vertical selector in the top bar).

| | |
|---|---|
| **Source of truth** | BRD v1.1 ([docs/BRD](./docs/BRD_Store_Layout_Design_Solution%20V1.1.md)) + FRD v1.1 ([docs/FRD](./docs/FRD_Store_Layout_Design_Solution%20V1.0.md)) |
| **UI mock** | [ui/ShelfPilot.dc.html](./ui/ShelfPilot.dc.html) (visual source of truth) · [ui/brand.md](./ui/brand.md) |
| **Requirements** | [requirements/requirements.md](./requirements/requirements.md) · [development-steps.md](./requirements/development-steps.md) |
| **Implementation** | [tasks-ui-mock.md](./tasks-ui-mock.md) · [tasks-ui-integration.md](./tasks-ui-integration.md) |
| **Status** | New application — UI + mock API phase |

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

---

## 3. Module → Screen Mapping

The BRD's six functional modules map onto the ShelfPilot navigation as follows:

| Module | BRD Description | ShelfPilot Screen |
|---|---|---|
| **M1** Store Setup, Canvas & Aisle Management | Store boundaries, dimensions, zones; aisle definition & validation | **Layout Editor** + New Store wizard |
| **M2** Shelving, Storage & Auto-Calculation | Fixtures with measurements; optimal shelf/fixture count | **Layout Editor** (fixture palette + capacity auto-calc) |
| **M3** Product & Category Management | Category hierarchy and product catalog master data | **Products & Categories** |
| **M4** Category Mapping & 2D/3D Visualization | Assign categories to shelf zones; graphical render | **Layout Editor** (2D canvas + 3D view, color-coded mapping) |
| **M5** Analytics & Reporting | Utilization, capacity, category, version reports | **Analytics** |
| **M6** Administration & Configuration | Users, roles, master data, vertical configuration | **Admin & Config** |

**Flow:** M6 (setup & config) → M1 (store shell & aisles) → M2 (fixtures & auto-calc) → M3 (categories & products) → M4 (mapping & visualization) → M5 (reporting).

---

## 4. Screens & Features

### Login & Access Control
- Email/password sign-in with role selection: **Designer, Approver, Viewer, Admin**.
- Supports role-based access governance (BR-09).

### Dashboard
- Portfolio of store layout projects with status filters (draft / in review / approved, etc.).
- Entry point to create a new layout via the guided 3-step wizard (BR-01).

### Layout Editor (M1 + M2 + M4)
- Scaled canvas supporting rectangular and irregular/polygon floor plans (BR-01).
- Fixture palette — shelves, racks, gondolas, storage units with custom measurements (BR-03).
- Aisle definition with minimum-width / accessibility validation (BR-02).
- **Auto-calculation engine**: optimal fixture count for the store footprint, recalculated on dimension change (BR-04).
- Category mapping to shelf zones with color coding; interactive **2D and 3D** views (BR-06, BR-07).

### Products & Categories (M3)
- Hierarchical category tree and product catalog with vertical-specific attributes (BR-05).
- Supports bulk import/export of master data.

### Analytics (M5)
- Space utilization, category allocation, shelf capacity, and layout version comparison (BR-08).

### Admin & Config (M6)
- Tabs: **Users & Roles · Store Master · Approval Workflow · Configuration · Audit Log**.
- Central master data, role-based permissions, approval workflows, audit logging (BR-09).
- Global & vertical-specific configuration — units of measure, fixture/category templates, compliance rules — with **no code change per vertical** (BR-10).

---

## 5. Scope

**In scope:** store setup & canvas, fixture definition, aisle validation, category/product management, 2D/3D rendering, fixture auto-calculation, analytics & reporting, administration, system configuration.

**Out of scope:** POS integration, real-time inventory/stock management, physical fixture procurement, architectural/structural engineering, foot-traffic sensor hardware (possible future phase).

**Target verticals:** General Retail, Pharmacy/Pharma, Beauty & Cosmetics, Apparel & Footwear — extensible to others via configuration only.

---

## 6. Stakeholders

| Role | Responsibility |
|---|---|
| Store Planning / Design Team | Create and edit layouts (primary users) |
| Category / Merchandising Managers | Define categories and shelf mapping |
| Store Operations Managers | Review/approve layouts, validate aisle compliance |
| Business / Vertical Admin | Configure vertical templates and rules |
| IT / System Admin | User management, system configuration |
| Analytics / BI Team | Consume reporting outputs |
| Executive Sponsors | Review high-level utilization reports |

---

## 7. Assumptions & Constraints

- Store dimension data (length/width/height or floor-plan boundaries) is available at layout creation.
- Units of measure (metric/imperial) are defined globally or regionally.
- Fixture/shelf catalog is maintained as master data.
- Must support varying store shapes (rectangular + irregular polygon).
- Vertical-specific behavior via **configuration only**, never custom code.
- 3D rendering must perform on standard business hardware (no specialized GPU).

---

## 8. Acceptance Criteria (Summary)

- Create a layout by entering dimensions → immediately see a scaled blank canvas.
- Define and place at least one custom-measured fixture.
- Aisle validation flags minimum-width violations.
- Auto-calculated max fixture count recalculates on dimension change.
- Categories map to shelf areas visibly via color coding.
- Completed layout navigable in both 2D and 3D with mapped categories visible.
- Analytics reports show utilization and category allocation accurately.
- Same system configures a pharmacy layout and an apparel layout with no code change.

---

## 9. Design System & Branding

- **App name:** ShelfPilot
- **Attribution:** Built by the Foundry (InApp) — see [ui/brand.md](./ui/brand.md)
- **Logo:** Crimson rounded-square mark (`#A30A2A`) + white icon + **ShelfPilot** wordmark
- **Colors:** Primary `#A30A2A`, gradient `#C4183A → #A30A2A`
- **Neutrals:** `#F0F0F0` background, `#1f2933` ink, `#6b7280` / `#9aa1ab` secondary text
- **Type:** Plus Jakarta Sans (UI), DM Mono (measurements/labels)
- **3D:** Three.js for the interactive 3D layout view
- **In-app placement:** Logo on login + sidebar; “Built by the Foundry” on login footer and sidebar footer

---

## 10. Glossary

| Term | Definition |
|---|---|
| Fixture | Any shelf, rack, gondola, bin, or storage unit placed in a store |
| Facing | Number of product units presented on a shelf front |
| Aisle | Walkable pathway between fixtures |
| Vertical | A store-format category (retail, pharma, beauty, apparel…) |
| Category Mapping | Assignment of a product category to a physical shelf location |
| Auto-Calculation Engine | Module M2 capability computing optimal fixture counts from dimensions & rules |

---

_Derived from BRD v1.1 and the ShelfPilot interactive design. Canonical copy: `openspec/project.md`._
