# Proposal: Demo feedback — 2D fidelity, aisle numbering, WebGL, dashboard & autogen

**Status:** Implemented — 2026-07-29  
**Source:** Client demo presentation (2026-07-29). Clients were not satisfied with the current solution.

**Builds on:** `layout-client-feedback` (implemented), `shelf-face-letter-number-labels`, `layout-urgent-fixes`, `module-reframe-smart-autogen`.

## Summary

Six client-requested improvements from the July demo: fix **2D shelf/aisle alignment** and adopt **aisle-centric shelf numbering** (e.g. aisle 4 → **4A**, **4B**); migrate the **2D floor plan to WebGL** for reliable rendering; add **dimension-first store-area drawing** with editable W×D; show **product lists on shelf hover**; improve **Smart Generate** quality; and **rework the Dashboard** into a clearer executive home.

## Client requests (traceability)

| # | Client ask | Problem today | Priority |
|---|------------|---------------|----------|
| 1 | **2D layout is not proper** — shelves and aisles misaligned; clicking a shelf shows wrong numbering | Canvas uses DOM/SVG overlays; shelf labels use sequential letter scheme (**A1/A2**, **B1/B2**) instead of **aisle number + shelf letter** (**4A**, **4B**); back faces should use the **opposite aisle** number | P0 |
| 2 | Use **WebGL instead of canvas** so the floor plan displays properly | `Canvas2D.jsx` renders fixtures as HTML divs on a scaled stage — alignment, zoom, and hit-testing drift at scale; 3D already uses Three.js (`Scene3D.jsx`) | P0 |
| 3 | When drawing the **store area**, enter **dimensions at the top** → system draws that rectangle; user can **edit dimensions** afterward | Create form captures W×D but draw mode is polygon-only with no live dimension bar; envelope vs fixture zone editing is split across modes | P1 |
| 4 | **Hover a shelf** → show **products listed** on that shelf (face-aware) | No hover preview; products only visible in Merchandising tab or Planogram modal | P1 |
| 5 | **Autogeneration needs to be better** | Remaining gaps: runway alignment, aisle binding, uneven category fill, overlapping/misplaced fixtures reported in demo | P0 |
| 6 | **Dashboard rework** — clearer, more useful home for stakeholders | Current dashboard is analytics-heavy (KPIs + charts per layout) but lacks portfolio overview, status workflow, and demo-ready storytelling | P1 |

## Deliverables

### 1. Aisle-centric shelf numbering + 2D alignment (DF-01)

**Numbering scheme (client model):**

- Each **walk aisle** has a numeric **aisle number** (1, 2, 3, 4, …).
- Shelves facing that aisle are labelled **`{aisleNumber}{letter}`** — e.g. aisle **4** → **4A**, **4B**, **4C** (letters = shelf units along the aisle run, left-to-right in walk direction).
- **Dual-face gondola:** front face uses the aisle on the customer side (**4A**, **4B**); back face uses the **opposite aisle** number (**5A**, **5B** if aisle 5 is behind the spine).
- Selection, Properties, legend, Merchandising, and Planogram headers all show the same label.

**Alignment fixes:**

- Snap shelves to aisle spines and grid; gondola pairs share one footprint with correct spine divider.
- Aisle labels show aisle number on canvas; shelf badges show aisle-based labels.
- Click/hit-test returns the correct shelf + face with matching label.

*Replaces* the letter-first `A1/A2` display scheme from `shelf-face-letter-number-labels` for retail-facing labels (internal `displayNumber` may remain for ordering).

### 2. WebGL 2D floor plan (DF-02)

- Introduce **`FloorPlan2D`** (Three.js orthographic top-down) as the primary 2D view, sharing scene graph / fixture models with `Scene3D` where possible.
- Render store envelope, fixture polygon, aisles, shelves, zones, and labels in WebGL — consistent scale, crisp zoom, reliable picking.
- Keep existing editor interactions: select, drag, rotate, draw/edit polygon, focus zoom, fit-to-view.
- Fallback: retain current `Canvas2D` behind feature flag `VITE_USE_WEBGL_2D` until parity verified.

*Client rationale:* WebGL “shows properly” — eliminates DOM overlay misalignment and scaling artifacts.

### 3. Dimension-first store area drawing (DF-03)

- **Meter bar / draw toolbar** exposes editable **Store width** and **Store depth** (m) while in Draw area or Edit envelope mode.
- Changing dimensions **live-updates** the store envelope rectangle on canvas; user may still draw an inner **fixture polygon** within it.
- After apply: dimensions remain editable (PATCH envelope); fixture polygon edit unchanged.
- Optional: “Draw rectangle from dimensions” one-click when starting a new layout.

*Aligns with* measurement-first workflow from `layout-client-feedback` CF-01.

### 4. Shelf hover product preview (DF-04)

- On hover (500 ms debounce) over a shelf face in 2D (WebGL or legacy canvas): show **tooltip / popover** with:
  - Face label (e.g. **4A**)
  - Category name + colour swatch
  - Up to 8 product names/SKUs from that face’s planogram; “+N more” if truncated
- Empty face: “No products assigned”
- Keyboard/accessibility: focus + `aria-describedby` for equivalent info

### 5. Smart Generate improvements (DF-05)

| Area | Improvement |
|------|-------------|
| **Layout quality** | Stricter runway packing: equal aisle widths, shelves flush to aisle edges, no micro-gaps |
| **Aisle numbering** | Assign `aisleNumber` sequentially along primary flow; bind each shelf face to correct aisle |
| **Numbering** | Run aisle-centric label assignment post-pack (DF-01) |
| **Products** | Improve category ID resolution + fill rate; surface coverage % in toast and Smart Generate panel |
| **Preview** | Optional “Preview layout” before commit (ghost fixtures) |
| **Validation** | Block generate if fixture polygon missing; show alignment warnings before save |

*Extends* `layout-urgent-fixes` and CF-02 containment work.

### 6. Dashboard rework (DF-06)

Redesign **Dashboard** as a stakeholder-friendly home:

| Section | Content |
|---------|---------|
| **Hero summary** | Portfolio name, layout count, stores in review, last updated |
| **Status pipeline** | Cards/chips: Draft · In review · Approved · Rejected (click → Layouts filtered) |
| **Featured layout** | Thumbnail mini 2D/WebGL preview + key metrics for most recent or pinned layout |
| **Quick actions** | New layout, open last edited, pending approvals (role-gated) |
| **Compact analytics** | Keep KPI strip + one combined chart (space + category); move deep analytics to layout detail or Reports follow-on |
| **Recent activity** | Last 5 layouts with status badge, store type, utilisation |

Remove duplicate portfolio stats that mirror Layouts module; improve empty states for demo walkthrough.

## SEED units

| ID | Scope |
|----|-------|
| SEED-DF-01 | Aisle numbers + aisle-centric shelf labels (API packer, binding, web labels) |
| SEED-DF-02 | 2D alignment fixes on current canvas (interim) + shelf/aisle snap QA |
| SEED-DF-03 | WebGL `FloorPlan2D` + interaction parity + feature flag |
| SEED-DF-04 | Dimension bar for store envelope (draw + edit) |
| SEED-DF-05 | Shelf hover product tooltip (face-aware) |
| SEED-DF-06 | Smart Generate v2 (packing, aisle bind, product fill, preview) |
| SEED-DF-07 | Dashboard rework (UI + portfolio summary API if needed) |
| SEED-DF-08 | Tests, OpenAPI (`aisleNumber`, label helpers), spec fold, handover |

## Success criteria

- Autogenerate 4-aisle hypermarket → aisles labelled **1–4**; shelves on aisle 4 show **4A**, **4B**, …; back faces show opposite aisle labels (**3A**, **3B** when aisle 3 is behind).
- Click shelf **4B** → Properties, Merchandising, and Planogram all show **4B** (not **B2** or mismatched id).
- 2D view at 50%–400% zoom: shelves align with aisle centrelines; no visible drift vs grid.
- Toggle WebGL 2D → floor plan renders in Three.js; select/drag/rotate works; labels readable.
- Draw area: enter **20 × 15 m** in toolbar → envelope rectangle appears; edit to **22 × 15** → canvas updates; inner fixture polygon preserved.
- Hover shelf face with products → tooltip lists SKU/name within 500 ms.
- Smart Generate on demo L-layout → 0 containment violations, >80% category product fill when catalog seeded, toast shows coverage.
- Dashboard shows status pipeline + featured layout; client can grasp portfolio health in <30 s without opening editor.

## Non-goals

- Full BIM/CAD import/export.
- Real-time multi-user collaborative editing.
- Mobile-native layout editor (responsive web only).
- Replacing 3D walkthrough — WebGL 2D complements Orbit/Walk modes.
- Email/Slack notifications for dashboard status (in-app only).

## Relationship to prior changes

| Prior change | Relationship |
|--------------|--------------|
| layout-client-feedback | Envelope + polygon + autogen containment — **extend** DF-03, DF-05 |
| shelf-face-letter-number-labels | A1/A2 scheme — **supersede retail labels** with aisle-centric DF-01 |
| layout-urgent-fixes | Aisle binding, gondola merge — **extend** DF-01, DF-05 |
| SEED-07b-viz-2d-fidelity | 2D visual parity — **fold into** DF-02 WebGL approach |
| module-reframe-smart-autogen | Dashboard + Smart Generate — **rework** DF-06, DF-05 |

See [REVIEW.md](./REVIEW.md) for decisions needed before implementation.
