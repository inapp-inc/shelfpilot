# BRD Addendum — Demo Feedback & Delivery Update (Aug 2026)

**Document type:** Business Requirements Addendum (extends BRD v1.1 / FSD ShelfPilot)  
**Meeting / demo date:** 2026-08-10 (customer demo)  
**Document date:** 2026-08-11  
**Status:** Draft for product review — mixes **delivered** work and **agreed next** requirements  
**Related:** `project.md`, `Docs/FSD_ShelfPilot.md`, `Docs/FLOOR_PLAN_IMPORT_SPEC.md`, `Docs/DEMO_CHANGES_SUMMARY.md`, `Docs/MY_CHANGES_EXPORT.md`

---

## 1. Purpose

Capture:

1. Capabilities delivered in the recent demo cycle that are **not yet reflected** in the baseline BRD / `project.md`.
2. Customer demo feedback (Aug 2026) as **traceable business requirements** for the next delivery slice.
3. Clarifications on **aisle-centric shelf selection and 3D viewing** (critical UX correction from the demo).

This addendum does **not** replace BRD v1.1; it supersedes conflicting points where noted.

---

## 2. Demo feedback summary (agreed direction)

| # | Theme | Decision |
|---|--------|----------|
| DF-01 | Product dimension buffer | Integrate **1 cm total buffer** (0.5 cm each side) into shelf-fill / facing math for packaging & spacing. |
| DF-02 | Temporary storage | Add a **temporary storage** fixture type (display tables / pallets) that planners can place for seasonal / promo periods. |
| DF-03 | Shelves viewing menu + Customer role | New **full-screen find-product / wayfinding** experience for a **Customer** role: select layout → find product → directions to aisle/shelf. No edit rights. Flat adjacent/opposite shelf view preferred over heavy 3D navigation for customers. |
| DF-04 | Warehouse layout separation | Plan a distinct **Warehouse** store type / layout mode with different fixture templates and dimensions from Store. *(Needs further product design — see §6.)* |
| DF-05 | Aisle-centric selection (2D & 3D) | Selection must follow **aisle binding**, not gondola pair merge. Clicking one face must **not** select both sides of a back-to-back unit. Opposite faces of the **same aisle** (and only that aisle’s shelves) are the adjacency model. |
| DF-06 | 3D aisle presence | 3D must show **aisles in front of each merchandising face** and support aisle-based focus/selection consistent with 2D. |

---

## 3. Delivered since last BRD baseline (demo cycle)

These items are **implemented** (or substantially implemented) in the current codebase and should be treated as part of the living product brief.

### 3.1 Floor plan import → dimensions → layout build

- Upload PNG/PDF to **extract / confirm store dimensions**, then **Smart Generate / packer** builds fixtures — **not** a permanent image underlay as the primary UX.
- Spec: `Docs/FLOOR_PLAN_IMPORT_SPEC.md`.
- Shared dimension helpers: `codebase/shared/floorPlanDimensions.mjs`.
- Docker builds copy `shared/` for web/api image builds.

### 3.2 Layout arrangement summary & Smart Generate packing

- Arrangement / volume summary gate before product allocation (“Accept & continue”).
- Packer improvements: leftover fill, aisle clearances, no-overlap hardening, endcaps / compact fill.
- Merch allocation and arrangement summary services on API.

### 3.3 Planogram dimension-aware fill & stacking

- Smart Generate / auto-fill places products using **width × depth × stack height** vs shelf geometry.
- **Stack layers** limited by **level clear height** (including per-level `clearanceMeters` cap and inter-layer gap).
- Load (weight) caps still shed stack first, then depth, then width.

### 3.4 Layout editor interaction

- **Normal click** on shelf → opens planogram.
- **Ctrl (+ click)** → shelf **move / resize** mode (handles); **Enter** exits layout mode.
- Ctrl+click no longer stolen by canvas pan when the target is a shelf.

### 3.5 2D / 3D visualization

- WebGL 2D floor + Three.js 3D with racks, planogram products, and product images.
- Planogram **View in 3D** focuses a shelf; texture cache survives remount so images remain visible.
- Aisle-centric shelf labels (`4A`, `5A`, …) with orientation-aware aisle binding.

### 3.6 Known demo gap (must fix — DF-05 / DF-06)

**Current behaviour (incorrect vs customer expectation):**  
Gondola front/back are often treated as **one selected unit** in 2D merge and 3D highlight (`pairId`), so nearby / opposite faces light up together.

**Required behaviour:**  
Selection and highlight are **aisle-scoped**:

- Selecting shelf `4A` (aisle 4) selects **only** that physical merchandising face (and optionally offers “view other shelves on aisle 4”).
- The **paired back** facing aisle 5 (`5A`) is a **different selection** — not auto-selected with `4A`.
- In 3D, the **corridor for the selected aisle** is visible in front of the selected face(s); the camera / highlight follows that aisle, not the entire gondola block.

---

## 4. Functional requirements (new / changed)

### FR-BUF-01 — Product dimension buffer (DF-01)

| Field | Detail |
|-------|--------|
| **Priority** | High |
| **Module** | M2 / M4 (planogram & auto-fill) |
| **Requirement** | Facing, depth, and stack capacity calculations SHALL reserve a **1 cm (0.01 m) total lateral buffer** between products — modelled as **0.5 cm on each side** of a unit (or equivalent usable-width reduction). |
| **Acceptance** | Given product width *W* and usable width *U*, max facings = floor((*U* − buffers) / (*W* + buffer)) such that packing never exceeds physical clearance; unit tests cover the 1 cm rule. |
| **Status** | **Planned** (logic partially exists for board/clearance/stack gap; lateral 1 cm buffer still to finalize). |

### FR-TEMP-01 — Temporary storage fixtures (DF-02)

| Field | Detail |
|-------|--------|
| **Priority** | Medium |
| **Module** | M1 / M2 |
| **Requirement** | Palette SHALL include **Temporary storage** types (e.g. display table, pallet) placeable on the floor for seasonal/promo use. Entities are optional, may ignore strict category bay rules, and remain editable by Designer/Admin. |
| **Acceptance** | Designer can place, move, resize, and delete temporary storage; Analytics can report count/area separately from permanent fixtures. |
| **Status** | **Planned**. |

### FR-CUST-01 — Customer role & find-product wayfinding (DF-03)

| Field | Detail |
|-------|--------|
| **Priority** | High |
| **Module** | M4 / M6 (new Customer experience) |
| **Requirement** | Introduce role **Customer** (or equivalent Shopper persona): |
| | 1. Select a **layout** (store) they may browse. |
| | 2. **Full-screen** product find: search / browse catalog → result shows aisle + shelf label + optional path text. |
| | 3. Optional **flat shelves viewing** menu: adjacent / opposite shelves along the aisle on a 2D/flat screen — **not** requiring 3D orbit skill. |
| | 4. **No edit** of layouts, planograms, catalog, admin, or Smart Generate. |
| **Acceptance** | Customer login never exposes Designer controls; given a placed product, Customer is shown aisle id/label and shelf label; “View nearby shelves” lists aisle-bound neighbours. |
| **Status** | **Done** — Customer login opens the assigned store only; kiosk draws a walking line from a configured or assumed front-of-store entrance to the product shelf. Store picker is out of scope. |

### FR-WH-01 — Warehouse layout type (DF-04)

| Field | Detail |
|-------|--------|
| **Priority** | Medium (design first) |
| **Module** | M1 / M6 store types |
| **Requirement** | Separate **Warehouse** store type from retail **Store** layouts: own fixture templates, default dimensions, aisle rules, and possibly packing heuristics. |
| **Note** | Team agreed to **revisit sizing / shelving model** before implementation — do not rush a clone of Store with a different label. |
| **Acceptance** | TBD after design workshop (templates, min aisle, height defaults, pallet vs bay semantics). |
| **Status** | **Discovery / planned**. |

### FR-AISLE-01 — Aisle-based selection in 2D (DF-05)

| Field | Detail |
|-------|--------|
| **Priority** | Critical |
| **Module** | M4 Layout Editor |
| **Requirement** | Clicking a shelf face selects **that physical shelf record** (or that face on a true double-sided unit). Gondola pair mates facing a **different aisle** MUST NOT be co-selected. |
| **Acceptance** | Click front of gondola on aisle 4 → selection id = aisle-4 shelf; back half on aisle 5 remains unselected until clicked. Planogram opens for the selected face only. |
| **Status** | **Implemented** (2026-08-11) — per-face selection on gondola panes; mate not co-selected. |

### FR-AISLE-02 — Aisle-based selection & corridors in 3D (DF-05, DF-06)

| Field | Detail |
|-------|--------|
| **Priority** | Critical |
| **Module** | M4 3D |
| **Requirement** | 3D highlight and camera focus follow the **selected aisle + face**. Aisle geometry is rendered **in front of** merchandising faces. Opposite-aisle pair face is not auto-highlighted. |
| **Acceptance** | View in 3D / shelf focus shows aisle corridor for the active face; products and labels match aisle-centric numbering. |
| **Status** | **Implemented** (2026-08-11) — face-scoped highlight, aisle corridor emphasis, opposite face dimmed in focus. |

### FR-VIEW-01 — Shelves viewing menu (DF-03)

| Field | Detail |
|-------|--------|
| **Priority** | High (pairs with Customer; useful for Viewer too) |
| **Module** | M4 |
| **Requirement** | Menu / mode to view **adjacent and opposite shelves** on a flat canvas or strip UI without 3D navigation. Binding key = `aisleId` (+ shelf index order). |
| **Acceptance** | From shelf `4B`, user can open aisle-4 strip showing `4A`…`4n` and optionally “facing across aisle” if modelled; no edit in Customer role. |
| **Status** | **Planned**. |

---

## 5. Roles (updated)

| Role | Create/edit layout | Planogram | Approve | Admin | Find product / wayfinding |
|------|--------------------|-----------|---------|-------|---------------------------|
| Designer | Yes | Yes | No | No | Yes (editor context) |
| Approver | No | View | Yes | No | Yes |
| Viewer | View | View | No | No | Yes |
| Admin | Yes | Yes | Yes | Yes | Yes |
| **Customer** *(new)* | **No** | **No** | **No** | **No** | **Yes (primary)** |

---

## 6. Open questions (Warehouse & Customer)

1. Warehouse: pallet rack vs retail gondola — same canvas or separate editor skin?
2. Customer: which layouts are visible (approved only? assigned stores?)?
3. Buffer: apply only to auto-fill, or also manual planogram facing preview?
4. Temporary storage: does it consume “capacity” in fixture auto-calc?

---

## 7. Suggested delivery order

1. **FR-AISLE-01 / FR-AISLE-02** — fix selection & 3D aisle focus (demo blocker).  
2. **FR-BUF-01** — 1 cm product buffer in facing math.  
3. **FR-TEMP-01** — temporary storage fixture.  
4. **FR-CUST-01 + FR-VIEW-01** — Customer role + flat aisle shelf viewer + wayfinding.  
5. **FR-WH-01** — Warehouse type after design workshop.

---

## 8. Traceability to modules (BRD M1–M6)

| Addendum ID | BRD module | Notes |
|-------------|------------|-------|
| DF-01 / FR-BUF-01 | M2, M4 | Capacity & planogram accuracy |
| DF-02 / FR-TEMP-01 | M1, M2 | New fixture class |
| DF-03 / FR-CUST-01 / FR-VIEW-01 | M4, M6 | New persona + visualization mode |
| DF-04 / FR-WH-01 | M1, M6 | Store-type configuration |
| DF-05–06 / FR-AISLE-* | M1, M4 | Aisle model is source of truth for selection & 3D |

---

## 9. Glossary additions

| Term | Definition |
|------|------------|
| Aisle-bound shelf | Physical shelf (or face) whose `aisleId` is the corridor it faces |
| Gondola pair | Two physical shelves sharing a footprint (`pairId`); **shopped from different aisles** |
| Temporary storage | Non-permanent fixture (table/pallet) for promo / seasonal merch |
| Customer role | End-user persona: find product & navigate; no design rights |
| Product buffer | Reserved spacing in facing math (1 cm total / 0.5 cm per side) |

---

_End of addendum. Canonical product brief updates: repository `project.md` and `openspec/project.md`._
