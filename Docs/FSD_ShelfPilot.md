# Functional Specification: ShelfPilot

**Version:** 1.2  
**Date:** 2026-08-11  
**Status:** Draft — consolidated (LE + AG + ML + docs-quality-refresh) + Aug 2026 demo addendum  
**Author:** AI-Generated from layout-editor-planogram, layout-autogen-walkthrough, merch-layers-polygon-fix  
**Stakeholders:** Store Planning, Merchandising, Operations, Vertical Admin, IT Admin, Analytics, Executive Sponsors, Customer/Shopper (planned)  

**Traceability:** Gaps F1–F5, D1–D3, I1–I3, N1–N4, S1–S3 · Source: `project.md` · Changes: `layout-editor-planogram`, `layout-autogen-walkthrough`, `merch-layers-polygon-fix`, `docs-quality-refresh`  

**Aug 2026 BRD addendum (authoritative for new demo requirements):** [`Docs/BRD_ADDENDUM_DEMO_AUG_2026.md`](./BRD_ADDENDUM_DEMO_AUG_2026.md) — FR-AISLE-*, FR-BUF-01, FR-TEMP-01, FR-CUST-01, FR-VIEW-01, FR-WH-01.

---

## 1. Executive Summary

ShelfPilot is a vertical-agnostic platform for designing, visualizing, and optimizing physical-store layouts in interactive 2D and 3D. This delivery implements the **UI + mock API** phase: role-based access, dashboard and guided store wizard, modular layout editor (draw-area polygon, rules autogenerate, aisles/shelves, DnD, category-gated multi-level planogram, 2D wheel-zoom, Orbit/Walk 3D), product create/update, analytics, and admin/configuration — configurable across Retail, Pharmacy, Beauty, and Apparel without code changes per vertical.

## 2. Background & Problem Statement

Store planners today rely on spreadsheets and CAD, causing slow redesign cycles, inaccurate capacity, and inconsistent layouts across formats. ShelfPilot replaces that with a guided digital workflow, auto-calculation, and stakeholder-ready 2D/3D visuals (BO-01–BO-07).

## 3. Goals & Success Criteria

| Goal | Success Metric |
|------|----------------|
| Guided layout creation | Dimensions → scaled blank canvas immediately |
| Fixture & aisle integrity | Custom fixture placeable; min-width aisle violations flagged |
| Auto-calculation | Max fixture count recalculates on dimension change |
| Mapping & visualization | Color-coded category mapping visible in 2D and 3D |
| Analytics | Utilization and category allocation reports accurate vs layout data |
| Vertical reuse | Pharmacy and apparel layouts via configuration only |

**Out of scope:** POS, real-time inventory, fixture procurement, structural engineering, foot-traffic hardware.

## 4. Stakeholders & User Personas

| Role | Interest |
|------|----------|
| Store Planning / Design | Create/edit layouts (Designer) |
| Category / Merchandising | Categories and shelf mapping |
| Store Operations | Review/approve, aisle compliance (Approver) |
| Vertical Admin | Templates and rules |
| IT / System Admin | Users, config (Admin) |
| Analytics / BI | Reporting outputs |
| Executive Sponsors | High-level utilization |

**Personas:** Designer (primary editor), Approver (workflow), Viewer (read-only), Admin (M6).

## 5. Functional Requirements

### Epic A — Login & Access Control (F1, I2)
- **A1** Email/password sign-in with role selection: Designer, Approver, Viewer, Admin.
- **AC:** Given valid credentials and role, When user signs in, Then session is established and navigation matches role permissions.

### Epic B — Dashboard (F2)
- **B1** Portfolio of store layout projects with status filters (draft / in review / approved).
- **B2** Guided 3-step wizard to create a new layout (BR-01).
- **AC:** Given authenticated Designer, When filtering by status, Then only matching layouts show; When completing wizard with dimensions, Then a new draft layout opens on a scaled canvas.

### Epic C — Layout Editor M1 (F3, D3)
- **C1** Scaled canvas for rectangular and irregular/polygon floor plans.
- **C2** Zone and aisle definition with minimum-width / accessibility validation.
- **C3** Layout Editor implemented as **reusable components** (shell, 2D canvas, palette, properties, 3D) — not a single monolithic page module.
- **C4** Drag-and-drop placement and move of aisles and shelves on the 2D canvas with snap-to-grid persistence.
- **AC:** Given a layout with dimensions, When user defines an aisle below min width, Then UI flags a validation violation.
- **AC:** Given Designer drags a shelf from the palette onto the canvas, When dropped, Then shelf position is persisted and visible after reload.

### Epic D — Shelves, Aisles & Auto-Calc M2 (F3)
- **D1** Separate palette tools: **aisles** (corridor spacing/width) vs **shelves** (height, depth, usable face width, levels).
- **D2** Auto-calculation of optimal shelf/fixture count; recalculate on dimension change.
- **D3** Per-shelf level configuration (height from floor, clearance); aisle width configured independently.
- **AC:** Given placed shelves and store footprint, When dimensions change, Then auto-calc max count updates.
- **AC:** Given an aisle and a shelf, When aisle width and shelf height are edited separately, Then each value persists on its own entity.

### Epic E — Products & Categories M3 (F2)
- **E1** Hierarchical category tree and product catalog with vertical-specific attributes (including optional widthMeters/heightMeters for planogram).
- **E2** Bulk import/export of master data (mock file upload/download acceptable).
- **E3** Excel import opens a dialog to choose the target **store type** (default = active type) with drag-and-drop or click-to-browse for `.xlsx`/`.xls`/`.csv`; rows without a `storeType` value are imported into the selected store type's vertical (not a hardcoded `retail` fallback).
- **AC:** Given Admin or Designer, When importing a category CSV (mock), Then hierarchy updates and is available for mapping.
- **AC:** Given the active store type is Retail, When the user imports a sheet with **Hypermarket** selected in the import dialog, Then imported categories/products are stored under the hypermarket vertical and the catalog view switches to Hypermarket.

### Epic F — Mapping & 2D/3D M4 (F3, N1)
- **F1** Assign categories to **shelves** and optionally **aisles** independently (separate mapping; shelf category does not overwrite aisle).
- **F2** Interactive 2D canvas and upgraded Three.js 3D view showing aisle corridors, shelf levels, and mapped colors.
- **AC:** Given aisle and shelf each mapped to different categories, When viewing 2D/3D, Then both mappings remain distinct.
- **AC:** Given mapped shelves with levels, When switching to 3D, Then levels render without console errors on standard hardware.

### Epic F2 — Planogram (shelf facings)
- **P1** Add catalog products to a shelf face/level (“in front”).
- **P2** Compute max facings from `floor(usableWidthMeters / productWidthMeters)`; clamp requested facings to max.
- **P3** When heights exist, expose suggestedLevels = `floor(shelfHeight / productHeight)` as advisory metadata.
- **P4** Shelf has one category; product list = that category **plus descendant categories**; unmapped shelf blocks planogram.
- **AC:** Given usable width 1.2m and product width 0.2m, When placing product on level 0, Then maxFacings is 6.
- **AC:** Given Viewer, When POST planogram, Then 403.
- **AC:** Given shelf without category, When POST planogram, Then 400 `shelf_category_required`.
- **AC:** Given shelf category parent with child product, When listing planogram products, Then child products appear.

### Epic F3 — Polygon draw, rules autogen, 3D walk (layout-autogen-walkthrough)
- **A1** Draw/edit irregular polygon floor; adjust size/area after draw.
- **A2** Strict containment: aisles/shelves never outside polygon (API reject + generate clip).
- **A3** Rules-based **Generate aisles & shelves** (no LLM); maximize compliant shelves with min aisle clearance; leave categories unmapped.
- **A4** 3D Orbit (scroll zoom / pan) and Walk mode; products visible on shelves.
- **AC:** Given closed polygon, When Generate, Then all entities are inside the polygon and categories are null.
- **AC:** Given shelf moved outside polygon, When PATCH, Then 400 `containment_violation`.
- **AC:** Given Walk mode and planogram facings, When viewing 3D, Then facing meshes are visible.

### Epic F4 — Product CRUD, tight packer, 2D zoom, multi-layer (merch-layers-polygon-fix)
- **M1** Add and update products in Catalog (including dimension attributes).
- **M2** Autogenerate footprints stay inside **drawn** polygon (fix AABB overflow).
- **M3** 2D canvas mouse-wheel zoom toward pointer.
- **M4** Place different products on different shelf levels; shelf type drives default level count.
- **AC:** Given L-shaped polygon, When Generate, Then containmentViolations is empty.
- **AC:** Given shelf levels 0 and 1, When placing different SKUs per level, Then both placements persist.
- **AC:** Given Catalog, When Designer creates/updates a product, Then it is available in planogram pickers.
- **Reuse:** See `Docs/REUSE_LAYOUT_PLANOGRAM.md`.

### Epic G — Analytics M5 (F5)
- **G1** Space utilization, category allocation, shelf capacity, layout version comparison.
- **AC:** Given a completed layout, When opening Analytics, Then utilization and allocation match layout geometry and mappings.

### Epic H — Admin & Config M6 (F4, N4)
- **H1** Tabs: Users & Roles, Store Master, Approval Workflow, Configuration, Audit Log.
- **H2** Global and vertical-specific config (UoM, templates, compliance) with no code change per vertical.
- **AC:** Given Admin switches vertical to Pharmacy vs Apparel, When creating a layout, Then templates/rules differ without redeploy.

---

## 5b. Change note — layout-editor-planogram (2026-07-15)

**OpenSpec change:** `openspec/changes/layout-editor-planogram/`  
**SEED series:** SEED-LE-00 … SEED-LE-07 (`Docs/seeds/SEED-LE-*.md`)

Supersedes the monolithic editor UX for merchandising workflows. Legacy `fixtures` remain readable and are synthesized into `shelves` during migration.

## 5c. Change note — layout-autogen-walkthrough (2026-07-15)

**OpenSpec change:** `openspec/changes/layout-autogen-walkthrough/`  
**SEED series:** SEED-AG-00 … SEED-AG-06 (`Docs/seeds/SEED-AG-*.md`)

Adds draw→generate→category-filter→walk flow. Autogen is **rules-based only** (option A). Strict polygon containment. No LLM / auto category zoning in this change.

## 5d. Change note — merch-layers-polygon-fix (2026-07-15)

**OpenSpec change:** `openspec/changes/merch-layers-polygon-fix/`  
**SEED series:** SEED-ML-00 … SEED-ML-05 (`Docs/seeds/SEED-ML-*.md`)  
**Reuse:** `Docs/REUSE_LAYOUT_PLANOGRAM.md`

Product add/update; polygon-tight autogen fix; 2D wheel zoom; multi-level planogram by shelf type; reuse guide for other products.

## 5e. Change note — module-reframe-smart-autogen (2026-07-16)

**OpenSpec change:** `openspec/changes/module-reframe-smart-autogen/`  
**SEED series:** SEED-MR-00 … SEED-MR-07 (`Docs/seeds/SEED-MR-*.md`)

Reframes app by module: Dashboard = analytics KPIs; Layouts = portfolio + single-form create + canvas; emoji nav; smart generate with category mix sliders and chilled/frozen zones. OpenAPI v0.6.0.

## 5f. Change note — dual-face-numbered-shelves-strict-polygon (2026-07-16)

**OpenSpec change:** `openspec/changes/dual-face-numbered-shelves-strict-polygon/`  
**SEED series:** SEED-DF-00 … SEED-DF-06 (`Docs/seeds/SEED-DF-*.md`)

Strict **drawn-area** canvas (polygon AABB viewport); shelf **display numbers** instead of type labels; gondola **Face A / Face B** with independent category and planogram; autogenerate assigns numbers and reports `skippedOutsideCount`. OpenAPI v0.7.0.

## 5g. Change note — layout-client-feedback (2026-07-21 / methodology 2026-07-27)

**OpenSpec change:** `openspec/changes/layout-client-feedback/`  
**SEED series:** SEED-CF-01 … SEED-CF-11 (`Docs/seeds/SEED-CF-*.md`)  
**Methodology:** [Docs/Standard Methods for Store Layout Design.md](./Standard%20Methods%20for%20Store%20Layout%20Design.md)

Implements **measurement-driven design with graphical visualization**:

- **Store envelope** vs **fixture polygon** (dual boundary on canvas and meter bar).
- Strict autogen containment; **category → fixture type** mapping (produce → storage, etc.).
- Viewport-fit editor, fit-to-view, category/selection focus zoom.
- Editable shelf name; polygon **vertex and edge** edit mode; **rubber-band line draw** when tracing boundaries.
- Review workflow with rejection comments and button gating.
- **Clone layout** for master-plan reuse; methodology hints in 2D vs 3D modes.
- **Dual-face gondola 3D**: Face A (A1) and Face B (A2) merchandising on opposite sides; **vertical aisles** render correctly in mixed-orientation layouts.
- **Gondola runway autogen**: aisle · **front shelf + back shelf pair** (same footprint, opposite facing) · aisle. Labels A1 / A2.

## 6. Non-Functional Requirements

- **NFR-1 Performance:** 3D interactive on standard business laptops (no discrete GPU required).
- **NFR-2 Security:** Mock auth with RBAC; input validation; no secrets in client; correlation IDs on API.
- **NFR-3 Configurability:** Vertical behavior via configuration only.
- **NFR-4 Observability:** Correlation ID middleware; layout save and auto-calc latency logs.
- **NFR-5 Platform:** ADR-0001 MERN + Python as-is; OpenAPI at `Docs/openapi.yaml`.

## 7. High-Level Architecture (preview)

- **Web:** React (ShelfPilot UI, brand tokens from UI SoT `ui/ShelfPilot.dc.html`).
- **API:** Express implementing `Docs/openapi.yaml`.
- **Data (local):** **SQLite** file via `SQLITE_PATH` (Docker volume for compose). Repository boundary allows future Mongo for cloud (ADR-0004).
- **Calc/Analytics:** Node implementation in API for MVP.
- **3D:** Three.js client-side.
- **Local deploy:** Docker Compose — `api` + `web` (nginx) + SQLite volume. See `Docs/ARCHITECTURE_LOCAL.md`.

## 8. User Flows

1. Login → Dashboard → New Store wizard → Layout Editor → **draw/adjust area** → **Generate aisles & shelves** → assign shelf categories → place products (filtered) → 2D/Orbit/Walk 3D review → submit for approval → Analytics.
2. Admin → Configuration → select vertical templates → Audit Log review.

## 9. Assumptions

| ID | Assumption | Disposition |
|----|------------|-------------|
| A-D2 | In-memory/JSON mock store for UI+mock API | Assume |
| A-I2 | Mock auth, no external IdP | Assume |
| A-N3 | Single-tenant prototype; tenantId reserved | Assume |
| A-S3 | project.md authoritative until BRD/FRD imported | Defer |
| A-UI | Visual UI SoT = `ui/ShelfPilot.dc.html` | Decided |
| O1 | Persistence = in-memory+JSON seed | Decided |
| O2 | Auto-calc in Express/Node for MVP | Decided |

## 10. Constraints

- Vertical-specific behavior never via custom code forks.
- Must support rectangular and irregular polygon shapes.
- Brand: ShelfPilot crimson `#A30A2A`, Plus Jakarta Sans, DM Mono, Foundry attribution.
- **UI implementation MUST match** `ui/ShelfPilot.dc.html` (see `openspec/changes/ui-reference-integration/`).

## 11. Open Questions

- None blocking MVP after O1/O2 decisions. Revisit IdP and Mongo when exiting mock phase.

## 12. Out of Scope

POS, real-time inventory, procurement, structural engineering, foot-traffic sensors.

## 13. Glossary

See project.md §10 (Fixture, Facing, Aisle, Vertical, Category Mapping, Auto-Calculation Engine).

## 14. Traceability

| Spec ID | Gap / AC | Module |
|---------|----------|--------|
| A1 | F1, I2 | Login |
| B1–B2 | F2 | Dashboard |
| C1–C2 | F3, D3 | M1 |
| D1–D2 | F3 | M2 |
| E1–E2 | F2 | M3 |
| F1–F2 | F3, N1 | M4 |
| G1 | F5 | M5 |
| H1–H2 | F4 | M6 |
