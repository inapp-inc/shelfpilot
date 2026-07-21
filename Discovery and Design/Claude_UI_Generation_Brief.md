# ShelfPilot — Claude UI Generation Brief

> Paste this entire document into Claude (Artifacts / Claude Design / Claude Code) to generate high-fidelity UI for ShelfPilot.
> Product brief source: `project.md` · Brand: Foundry (InApp)

---

## Your task

Design a **complete desktop-first web application UI** for **ShelfPilot**, a vertical-agnostic platform for designing, visualizing, and optimizing physical-store layouts in **2D and 3D**.

Produce:

1. A cohesive **design system** (tokens, type, components)
2. High-fidelity frames for **every screen** listed below
3. Short interaction notes (hover, empty, error, success) per screen
4. Optional: React + CSS (or Tailwind) component structure that matches the screens — keep markup clean and production-usable

Do **not** invent product features outside this brief. Prefer clarity over decoration.

---

## Product one-liner

ShelfPilot lets store planners, merchandisers, and operations teams digitally design store layouts, place fixtures and aisles, map product categories to shelves, and review results in interactive 2D/3D — configurable for Retail, Pharmacy, Beauty, and Apparel **without code changes per vertical**.

**Attribution:** Built by the Foundry (InApp)

---

## Brand (strict)

| Token | Value |
|-------|--------|
| App name | **ShelfPilot** (hero-level on login; wordmark in sidebar) |
| Logo | Crimson rounded-square mark `#A30A2A` + simple white aisle/shelf icon + **ShelfPilot** wordmark |
| Primary | `#A30A2A` |
| Gradient | `#C4183A` → `#A30A2A` |
| Background | `#F0F0F0` with soft warm wash (not flat white; not dark mode) |
| Surface / panels | `#FFFFFF` |
| Ink | `#1f2933` |
| Muted text | `#6b7280` / `#9aa1ab` |
| Borders | `#e5e7eb` |
| Sidebar | Deep charcoal `#1f2933` → `#2a3440` |
| UI type | **Plus Jakarta Sans** |
| Measurements / codes | **DM Mono** |
| Footer copy | “Built by the Foundry” on login footer and sidebar footer |

### Visual rules (must follow)

- Brand first on login: app name must dominate the first viewport; no competing headline.
- One composition per screen; one job per section.
- No purple/indigo AI defaults; no cream+terracotta newspaper look; no Inter/Roboto/Arial.
- Cards only when they contain a real user action (e.g. project picker). No card-heavy dashboards.
- No floating badges/stickers on canvas/hero media.
- Real visual anchor on Layout Editor = store floor plan canvas (not abstract gradients).
- Subtle motion only: canvas pan/zoom, tab crossfade, wizard step progress.

---

## App shell (after login)

**Left sidebar**

- Logo + ShelfPilot wordmark
- Nav items (in order):
  1. Dashboard
  2. Layout Editor
  3. Products & Categories
  4. Analytics
  5. Admin & Config
- Footer: “Built by the Foundry”

**Top bar**

- Current user name + role chip (Designer | Approver | Viewer | Admin)
- **Vertical selector:** Retail · Pharmacy · Beauty · Apparel
- Sign out

Roles affect what is editable (Designer edits layouts; Approver approves; Viewer read-only; Admin configures). Reflect this with disabled controls / tooltips where useful — do not hide entire nav.

---

## Screens to generate

### 1. Login

**Purpose:** Authenticate and choose working role.

**Elements**

- Centered brand block: logo mark + **ShelfPilot** wordmark (largest type on page)
- Supporting line: “Design store layouts in 2D and 3D”
- Fields: Email, Password, Role select (Designer / Approver / Viewer / Admin)
- Primary CTA: Sign in (crimson gradient button)
- Footer: Built by the Foundry
- Soft atmospheric background (crimson-tinted washes on `#F0F0F0`)

**States:** validation errors, loading on submit

---

### 2. Dashboard

**Purpose:** Portfolio of store layout projects; start new layout.

**Elements**

- Page title: Store layouts
- Filters: status (All / draft / in review / approved / rejected)
- Primary CTA: **New layout**
- Project list/grid: name, vertical, status chip, last updated
- Empty state when no projects

**New layout wizard (modal or dedicated panel) — 3 steps**

1. Store info (name)
2. Dimensions / shape (width m, depth m, optional height; rectangle vs irregular polygon note)
3. Review → Create

On create: user lands on Layout Editor with a **scaled blank canvas**.

---

### 3. Layout Editor (core screen — highest fidelity)

Combines modules M1 + M2 + M4.

**Layout**

| Zone | Content |
|------|---------|
| Left rail | Fixture palette: Shelf, Rack, Gondola, Storage (with default W×D in DM Mono); Aisle tool; Select/Move |
| Center | Large **2D scaled canvas** (grid floor plan). Floor boundary in crimson. Fixtures as colored rectangles. Aisles as paths. |
| Right / bottom strip | Properties (selected fixture measurements), Auto-calc readout, Validation alerts, Category mapping |
| Top of canvas | Toggle **2D | 3D**; layout name; status; zoom controls |

**Behaviors to show in UI**

- Place at least one custom-measured fixture
- Aisle below minimum width → clear **validation warning** (not subtle)
- Auto-calc: “Max fixtures: N” updates when dimensions change (show sample before/after in annotations)
- Category mapping: assign category → fixture fills with category color
- 3D view: isometric/perspective store with same color mapping (Three.js-ready composition — keep geometry simple)

**Measurements:** always DM Mono (e.g. `20.0 m × 12.0 m`)

---

### 4. Products & Categories

**Purpose:** Master data for mapping.

**Elements**

- Left: hierarchical **category tree** (vertical-aware; sample Pharmacy: OTC → Pain Relief)
- Right: **product table** (Name, SKU, Category, attributes)
- Actions: Add category, Add product, **Import**, **Export**
- Color swatch per category (used later on canvas)

---

### 5. Analytics

**Purpose:** Prove layout effectiveness.

**Elements**

- KPI strip: Space utilization %, Fixture count, Capacity (max fixtures), Footprint m²
- Chart/list: **Category allocation** (color + count)
- **Version comparison** panel: Layout A vs B deltas (utilization, fixture count)
- Select layout control if none selected

Keep charts simple and on-brand (crimson / ink / muted) — no rainbow dashboards.

---

### 6. Admin & Config

**Tabs (exact labels)**

1. Users & Roles  
2. Store Master  
3. Approval Workflow  
4. Configuration  
5. Audit Log  

**Configuration tab (critical)**

- Active vertical
- Units (metric / imperial)
- Min aisle width
- Fixture templates table
- Compliance rules list
- Approval workflow enabled toggle

Show that Pharmacy vs Apparel configs differ (e.g. min aisle 1.5 m vs 1.4 m) — same UI, different data.

**Audit log:** timestamp · actor · action · detail (monospace-friendly)

---

## Sample content (use in mockups)

**Users**

- Dana Designer · designer@shelfpilot.local · Designer  
- Pat Approver · approver@shelfpilot.local · Approver  
- Alex Admin · admin@shelfpilot.local · Admin  

**Projects**

- “Downtown Pharmacy #12” — pharmacy — in review  
- “Flagship Apparel Atrium” — apparel — draft  
- “Central Retail Pilot” — retail — approved  

**Fixtures on canvas**

- Gondola 1.8 × 0.9 m mapped to “OTC Medicines” (`#0ea5e9`)  
- Shelf 1.2 × 0.6 m unmapped (crimson wash)  
- Narrow aisle 0.8 m with validation error (pharmacy min 1.5 m)

---

## Component inventory to define

- Buttons: primary (gradient), secondary (outline), ghost, danger  
- Inputs, selects, checkboxes  
- Status chips: draft / in_review / approved / rejected  
- Sidebar nav item (default / active / hover)  
- Data table  
- Tree  
- Modal / wizard steps  
- Toast / inline alert (validation)  
- Empty states  
- Canvas toolbar  

---

## Accessibility & UX

- WCAG AA contrast on text vs backgrounds  
- Focus rings visible on keyboard  
- Don’t rely on color alone for aisle violations (icon + text)  
- Dense professional tool feel (CAD-lite), not consumer marketing site  

---

## Explicit non-goals for this UI pass

- POS / inventory / stock screens  
- Procurement or sensor hardware UIs  
- Dark mode  
- Mobile-first redesign (responsive ok; prioritize 1280–1440 px desktop)  

---

## Output format for Claude

Please respond with:

### A. Design system summary
Colors, type scale, spacing, radius, shadows (minimal).

### B. Screen-by-screen frames
For each screen: layout description + key components + 1–2 states.

### C. Layout Editor detail
Wire the canvas, palette, auto-calc, validation, 2D/3D toggle clearly.

### D. Optional implementation pack
If generating code: React functional components, CSS variables matching brand tokens, no purple theme, Plus Jakarta Sans + DM Mono via Google Fonts.

### E. Handoff notes
List assets needed (logo SVG) and what developers should plug into existing APIs (`/auth`, `/layouts`, `/categories`, `/analytics`, `/admin`).

---

## Success criteria (UI must make these obvious)

1. Dimensions entered → blank scaled canvas appears  
2. Fixture can be placed with visible measurements  
3. Narrow aisle shows a clear violation  
4. Auto-calc number is visible and feels live  
5. Category colors appear on the floor plan and in 3D  
6. Analytics shows utilization + allocation  
7. Switching vertical (Pharmacy ↔ Apparel) changes config/templates, not the chrome  

---

_End of brief. Generate the ShelfPilot UI now._
