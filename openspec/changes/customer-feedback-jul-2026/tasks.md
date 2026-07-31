# Tasks — customer-feedback-jul-2026

**Status:** Draft — pending review  
**Reference:** [proposal.md](./proposal.md)

---

## Task IDs (review checklist)

| ID | Title | Scope | Est. |
|----|-------|-------|------|
| **CUF-01** | Rename Inspector → Shelf information | Web | S | Done |
| **CUF-02** | Hide shelf labels when zoom &lt; 50% | Web | S | Done |
| **CUF-03** | Missing products toolbar dialog | Web | M | Done |
| **CUF-04** | Drag missing product → shelf + level picker | Web + API validation | L | Done |
| **CUF-05** | Shelf click → unified dialog (reduce side panel) | Web | L |
| **CUF-06** | Planogram redesign + product drag-and-drop | Web (+ API if gaps) | XL |
| **CUF-07** | Go to shelf in 3D view | Web | M |
| **CUF-08** | 3D view UX improvements | Web | L |
| **CUF-08a** | Planogram → full-height 3D shelf focus | Web | M |

**Legend:** S = small (1–2 sessions), M = medium, L = large, XL = multi-session feature

---

## Suggested implementation order

```
CUF-01 → CUF-02 → CUF-03 → CUF-07 → CUF-04 → CUF-05 → CUF-06 → CUF-08
```

CUF-01, CUF-02 can run in parallel.  
CUF-04 depends on CUF-03 (missing-products source).  
CUF-06 builds on CUF-05 (dialog shell).  
CUF-08 benefits from CUF-07 (shared shelf focus API).

---

## CUF-01 — Rename Inspector → Shelf information

**Status:** Implemented — 2026-07-30

**Goal:** Right panel label matches customer language (“Shelf information”), not generic “Inspector”.

### Scope
- [x] `EditorPanelShell` right rail: label **“Shelf information”** (collapsed vertical label too)
- [x] `aria-label` / `title` attributes updated
- [x] Any remaining “Inspector” copy in layout editor (tooltips, docs strings) grep and replace
- [x] No functional change to tab content (Props / Merch / Zones)

### Acceptance
- [ ] Right collapsed strip reads “Shelf information”
- [ ] Screen reader announces updated label
- [ ] Web build passes

### Evidence
- Screenshot: collapsed + expanded right panel label

---

## CUF-02 — Hide shelf labels when zoom &lt; 50%

**Status:** Implemented — 2026-07-30

**Goal:** After generate (fit-to-view at low zoom), aisle/shelf number badges are hidden until user zooms in enough to read them.

### Scope
- [x] Pass effective zoom (or scale) from `LayoutEditor` → `Canvas2D` / `FloorPlan2D`
- [x] Threshold: **per-shelf pixel size** — hide labels when on-screen width × height is too small; show when each fixture has enough area (not a fixed zoom %)
- [x] Affected overlays: aisle shelf badges (4A, 4B…), gondola face labels, category emoji overlays if they overlap unreadably (confirm in QA)
- [x] Optional: subtle “Zoom in to see shelf numbers” hint when labels hidden (canvas bar or one-time toast — decide in implementation)
- [x] 3D unaffected (separate unit CUF-08)

### Acceptance
- [ ] After Smart Generate + fit view at &lt;50%, no shelf number text on canvas
- [ ] Zoom to ≥50% → labels appear within one frame
- [ ] Selection/hover still works when labels hidden
- [ ] Web build passes

### Evidence
- Before/after screenshots at ~30% vs ~60% zoom

---

## CUF-03 — Missing products toolbar dialog

**Goal:** Move “Missing by category” out of the right Merch panel into a **toolbar action** beside Submit that opens a modal.

### Scope
- [x] Toolbar button: **“Missing products”** (or badge count e.g. `Missing (12)`) next to Submit / Approve cluster
- [x] Visible when `planogramCoverage.missingCount > 0` (or always with disabled state + “All placed”)
- [x] Modal content: reuse/adapt `MissingProductsPanel` — coverage summary + **grouped by category** list
- [x] Remove or demote duplicate from Merch tab side rail (keep link “Open missing products” optional)
- [ ] Click row: optional **go to nearest shelf** for that category (nice-to-have; not blocking)
- [x] Dismiss: Esc, backdrop, Close

### Acceptance
- [x] Missing products not required in side panel to discover gaps
- [x] Dialog shows same data as current coverage API
- [x] Toolbar badge count matches `missingCount`
- [x] Web build passes

### Evidence
- Screenshot: toolbar button + open dialog with category groups

---

## CUF-04 — Drag missing product → shelf + level picker

**Goal:** From missing-products dialog, drag a product onto a shelf on the 2D canvas; prompt for **level**; place with full validations.

### Scope
- [x] Missing-products dialog: products draggable (HTML5 DnD or pointer DnD) with ghost preview
- [x] Canvas drop target: shelf/fixture hit-test on drop coordinates
- [x] On drop → **Level picker dialog**: list levels 0…N-1 with height labels; default to recommended level from preview API if available
- [x] Confirm → `POST planogram` (existing API) with `shelfId`, `productId`, `levelIndex`, `faceId` (from shelf selection or default face A)
- [x] **Validations:**
  - Product category compatible with shelf/face category mapping
  - Level capacity / max facings (preview API)
  - Segment/bay rules if shelf has segments
  - Edit disabled when layout read-only
- [x] Success: toast, refresh coverage, refresh canvas/3D content revision
- [x] Error: inline message in level dialog (e.g. “Category mismatch”, “Level full”)

### Dependencies
- **CUF-03** (dialog is drag source)

### Acceptance
- [x] Drag missing SKU → drop on shelf → pick level → product appears on shelf planogram
- [x] Invalid drops rejected with clear message
- [x] Coverage count decrements after successful place
- [ ] API tests for validation paths if new server rules added

### Evidence
- Screen recording: drag → level pick → product on shelf in 2D hover/tooltip

---

## CUF-05 — Shelf click → unified dialog (reduce side panel)

**Goal:** Selecting/opening a shelf opens a **single dialog** with shelf properties + planogram; side panel becomes optional for advanced tabs (Zones, aisle props).

### Scope
- [ ] **Trigger:** shelf click (or double-click — decide one; document in REVIEW) opens `ShelfDialog`
- [ ] Dialog sections (tabs or accordion):
  - **Overview:** shelf label, type, aisle face (4A), dimensions, category
  - **Planogram:** embed CUF-06 grid when ready; until then embed current planogram modal content
  - **Actions:** Delete, Open in 3D (links CUF-07)
- [ ] Default: **auto-collapse right side rail** when dialog opens (respect user expand)
- [ ] Aisle / zone / entry selection: keep side panel or lighter property popover (not full dialog)
- [ ] Esc / Close returns to canvas without losing selection

### Dependencies
- Soft dependency on **CUF-06** for final planogram tab UX; v1 can wrap existing `PlanogramEditorModal`

### Acceptance
- [ ] Primary shelf workflow does not require Merch tab in side panel
- [ ] Dialog shows same PATCH/planogram capabilities as today
- [ ] Read-only layouts: dialog view-only

### Evidence
- Screenshot: shelf dialog with overview + planogram tab

---

## CUF-06 — Planogram redesign + product drag-and-drop

**Goal:** Proper visual planogram — level rows, bay columns, draggable products — per `shelf-planogram-visual-editor` proposal.

### Scope
- [ ] **Layout:** horizontal rows = levels (bottom-up), vertical columns = segments/bays
- [ ] **Product blocks:** name, SKU, facings bar; draggable between segments/levels where valid
- [ ] **Add product:** drag from catalog picker or missing-products list into bay cell
- [ ] **Segment management:** drag dividers or equal-split toolbar (reuse segment PATCH API)
- [ ] **Face toggle:** A / B for dual-face fixtures
- [ ] **DnD validations:** same as CUF-04 + one SKU per segment per level rule (document v1)
- [ ] Replace or supersede `PlanogramEditorModal` as primary surface inside CUF-05 dialog
- [ ] Mobile/tablet: touch-friendly minimum hit targets

### Dependencies
- **CUF-05** (dialog host)
- Reference: [shelf-planogram-visual-editor](../shelf-planogram-visual-editor/proposal.md)

### Acceptance
- [ ] User can rearrange products by drag without form-only Add flow
- [ ] Bay splits visible and editable in same view
- [ ] Web build + planogram API tests pass

### Evidence
- Screen recording: drag product between bays; resize segment

---

## CUF-07 — Go to shelf in 3D view

**Goal:** “Go to shelf” works when user is in (or switches to) **3D view** — camera lands on that fixture.

### Scope
- [ ] Extend `goToShelf(label)` in `LayoutEditor`:
  - 2D: existing pan/zoom + highlight (keep)
  - **3D:** set `focus3dRequest` / `highlightShelf3d` with shelf id + pair id
- [ ] `Scene3D`: camera ease to shelf AABB centre; frame shelf in view (orbit radius from fixture size)
- [ ] Toolbar or go-to input: optional **“Open in 3D”** checkbox or split button
- [ ] If user in 2D and chooses “View in 3D”: switch mode → then fly camera
- [ ] Walk mode: teleport/near-shelf entry point (basic v1 — full walk polish in CUF-08)

### Acceptance
- [ ] Type `4A` + Go while in 3D → camera animates to that shelf within 1s
- [ ] Highlight outline matches 2D selection colour
- [ ] Invalid label: same toast as 2D

### Evidence
- Screen recording: go-to from 2D input → 3D fly-to

---

## CUF-08 — 3D view UX improvements

**Goal:** Holistic 3D improvements — navigation, shelf discovery, presentation — building on CUF-07.

### CUF-08a — Planogram shelf focus 3D (implemented)

See [planogram-3d-shelf-view.md](./planogram-3d-shelf-view.md).

- [x] **View in 3D** from planogram → full-viewport shelf focus mode
- [x] Products aligned to planogram bays (merchandising width + segment offsets)
- [x] Gondola: resolve planogram from physical front/back shelf
- [x] Box + image facings; depth facings stack
- [x] Focus bar: Back to planogram / Close
- [x] ResizeObserver for WebGL canvas
- [x] Web build passes

### Scope (remaining)
- [ ] **Shelf list / picker** in 3D mode (compact panel or dropdown): aisles collapsible like 2D legend
- [ ] **Click shelf in 3D** → select + optional open CUF-05 dialog
- [ ] **Visual polish:** fixture labels at sensible distance, category colour on shelf edge, improved default lighting
- [ ] **Walk mode:** clearer entry (click to lock pointer), mini-map or compass optional
- [ ] **Products on shelves:** verify facings/textures align with 2D planogram after CUF-06 changes — **partial: CUF-08a planogram focus path**
- [ ] Performance: no regression on demo layout (target 30+ fps orbit)

### Dependencies
- **CUF-07** (shared focus/highlight plumbing)

### Acceptance
- [ ] Stakeholder can review layout in 3D without returning to 2D for every shelf
- [ ] Go-to-shelf + 3D picker + click-select behave consistently
- [ ] Web build passes

### Evidence
- Demo script walkthrough: 3D orbit → pick aisle 4 → see products → walk aisle

---

## CUF-09 — Docs, tests & handover (optional rollup)

Run after individual CUF units or incrementally per unit.

- [ ] Update `Docs/openapi.yaml` if planogram validation endpoints change (CUF-04)
- [ ] Spec delta in `specs/ui-fidelity/spec.md` for label zoom threshold (CUF-02)
- [ ] API tests: planogram place validations (CUF-04)
- [ ] Web: component tests for zoom label visibility, dialog open state
- [ ] `npm test` (api) + `npm run build` (web)
- [ ] Customer demo script / handover note

---

## Review notes for PM

Please confirm per ID:

1. **CUF-01** — Exact label: “Shelf information” vs “Shelf info” vs “Shelf details”?
2. **CUF-02** — 50% threshold OK? Hide category emojis too?
3. **CUF-03** — Button label and placement (left of Submit vs right of Approve)?
4. **CUF-04** — Drag source only from dialog, or also from a floating “missing” palette?
5. **CUF-05** — Single click vs double-click to open shelf dialog?
6. **CUF-06** — v1 scope: full visual editor or phased (grid first, DnD second)?
7. **CUF-07** — Auto-switch to 3D on go-to, or explicit “View in 3D” only?
8. **CUF-08** — Priority features if phasing needed (picker vs walk vs lighting)?

Reply with approved IDs (e.g. `CUF-01, CUF-02, …`) and any label/UX decisions — implementation will proceed **one ID at a time**.
