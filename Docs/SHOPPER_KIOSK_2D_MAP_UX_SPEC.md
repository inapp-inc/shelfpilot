# Store Finder — 2D Map & Navigation UX Specification

**Status:** Draft (requirements for next implementation slice)  
**Date:** 2026-08-13  
**Traceability:** FR-CUST-01 · FR-VIEW-01 · BRD addendum DF-03  
**Reference mockup:** `openspec/ui/ShelfPilot-Store-Finder-Kiosk.html`  
**Related code:** `ShopperFloorMap.jsx`, `shopperSchematicMap.js`, `shopperWayfinding.js`, `ShopperKioskPage.jsx`

---

## 1. Executive summary

Customers using the Store Finder kiosk report three related problems:

1. **The 2D map is hard to use** — too dense, too “technical”, and not readable at arm’s length on a kiosk screen.
2. **The walking route is hard to see or looks wrong** — the line does not read clearly as a path to follow, and in some layouts it appears misaligned or broken.
3. **Aisle numbers appear on shelves** — aisle identity should live in the **walkable corridor**, not repeated on every fixture label.

This document defines the **target customer-facing 2D experience**: what to show, where labels belong, how the route must look, and how it differs from the layout-editor view. It is written for product, design, and engineering before the next SEED slice.

---

## 2. Problem statement

### 2.1 Who is the user?

| Persona | Goal | Constraints |
|---------|------|-------------|
| **In-store customer** | Find a product quickly without staff help | Standing 0.5–1 m from screen; may be in a hurry; no layout-editing knowledge |
| **Store associate (demo)** | Show the kiosk confidently in a walkthrough | Needs predictable visuals on varied demo layouts |

### 2.2 Reported pain (Aug 2026 feedback)

| # | Symptom | Customer interpretation |
|---|---------|-------------------------|
| P1 | Map feels cluttered | “I can’t tell where to look.” |
| P2 | Route line weak / missing / wrong shape | “I don’t know which way to walk.” |
| P3 | Numbers like `4`, `4A`, `4B` on shelf blocks | “Why is the aisle number on the shelf? The aisle is the gap in the middle.” |
| P4 | Full layout fidelity | “This looks like the planner tool, not a store map.” |

### 2.3 Success criteria (measurable)

| ID | Criterion | Target |
|----|-----------|--------|
| SC-1 | Unaided comprehension | ≥ 8/10 pilot users can state “walk to Aisle N, shelf X” within 10 s of selecting a product |
| SC-2 | Route visibility | Route visible on 1080p kiosk from 1 m without zooming |
| SC-3 | Label clarity | Zero aisle-only numbers rendered on shelf polygons in customer map mode |
| SC-4 | Route integrity | Automated tests: route polyline never intersects shelf interior; ≥ 95% of demo layouts produce a route with ≥ 2 points |
| SC-5 | Mockup parity (visual intent) | Side-by-side review: corridor badges, animated walk line, target highlight match mockup intent (brand colors may differ) |

---

## 3. Current implementation (as-built)

### 3.1 Architecture

```
ShopperKioskPage
  ├─ product search / dock (text directions)
  └─ ShopperFloorMap (SVG)
        ├─ runwayBandsForMap     → grey corridor rects + aisle badge (number in circle)
        ├─ shelfTilesForMap      → exact rotated shelf polygons
        ├─ LabelPill per face    → shelfCanvasFaceLabel → often "4A", "4B"
        ├─ RouteLayer            → polyline from computeShopperRoute
        └─ EntryMarker + MapPin
```

Routing (`shopperWayfinding.js`) is **geometrically correct** in intent: entrance → axis-aligned connector → aisle centerline graph → shelf approach point, with shelf collision checks on segments.

### 3.2 Why it feels unfriendly

| Area | Current behavior | UX impact |
|------|------------------|-----------|
| **Visual model** | True layout geometry (rotated gondolas, arbitrary polygon) | Accurate for planners; overwhelming for shoppers |
| **Shelf labels** | Every face ≥ size threshold gets a pill; label = `aisleNumber + shelfLetter` (e.g. `4A`) via `shelfFaceDisplayLabel` | Aisle number duplicated on fixtures **and** in corridor badge |
| **Aisle badges** | One circle per aisle, centered in corridor | Correct placement, but competes with shelf pills |
| **Category / zone cues** | None on map | Mockup uses color per category zone + “Frozen wall” banner |
| **Default view** | Full store bounds (+ padding) until product selected | Small fixtures, small type |
| **Guided mode** | Dims non-target shelves; still renders non-target shelf labels when large enough | Noise remains |
| **Route stroke** | ~0.12–0.28 m in layout coordinates (`wayW = vb.width / 180`) | Often **sub-pixel thin** after `viewBox` scaling on kiosk |
| **Route layering** | Drawn after shelf fills, before labels | Can be visually lost against grey corridors and white shelves |
| **Route animation** | SVG `stroke-dasharray` in **meter space** | Dash pattern does not scale with screen pixels; animation may be invisible |
| **Entrance** | Assumed front plaza when not configured | Connector may look like a stray segment if plaza is small |
| **Pin vs route end** | Pin at shelf face; route ends at approach point | Gap or overlap can look like the line “stops early” or “goes into the shelf” |

### 3.3 Root cause: two labeling systems merged

The layout editor uses **aisle-centric shelf codes** (`4A` = aisle 4, first bay). That is correct for planogram staff.

The customer kiosk mockup uses **separated concerns**:

| Information | Mockup placement | Current app |
|-------------|------------------|-------------|
| Aisle number | Circle at **bottom of corridor** (below gondola run) | Circle in corridor ✓ **and** prefix on shelf |
| Category / zone | Vertical name on colored gondola strip | Not shown |
| Shelf / bay | Shown in dock & shelf guide (`A4·2`), **not** on every map tile | Pill on every visible shelf face |
| Product location | Amber pin at shelf front | Brand pin ✓ |

**Conclusion:** The kiosk map reuses editor label functions without a **customer map label profile**.

---

## 4. Design principles (customer 2D map)

1. **Corridor = aisle, block = shelf** — Shoppers navigate aisles; they only need shelf detail at the destination.
2. **Progressive disclosure** — Browse: schematic overview. Selected product: zoomed route + target shelf only.
3. **One primary number per concept** — Aisle number appears **once per aisle** on the map (corridor badge).
4. **Route is the hero** — After product selection, the walk line must be the highest-contrast element.
5. **Schematic over survey** — Simplify geometry for readability; fidelity is secondary to wayfinding.
6. **Text in the chrome, graphics on the map** — Full sentence directions live in the dock; the map reinforces with color, motion, and icons.

---

## 5. Target information hierarchy

### 5.1 Map layers (bottom → top)

| Z | Layer | Browse mode | Guided mode (product selected) |
|---|-------|-------------|--------------------------------|
| 1 | Store outline | ✓ | ✓ |
| 2 | Zone tints (optional category bands) | ✓ muted | ✓ muted |
| 3 | Aisle corridors (runway fill) | ✓ | Target aisle emphasized; others dimmed |
| 4 | Shelf blocks (simplified rects) | ✓ outline only | Target shelf filled; others dimmed |
| 5 | **Walking route** | Hidden | **Bold, animated, above shelves** |
| 6 | Aisle badges (number only) | ✓ | Target badge emphasized |
| 7 | Shelf bay labels | **Hidden by default** | **Target shelf only** (bay letter/number, **no aisle prefix**) |
| 8 | Entrance marker | ✓ | ✓ |
| 9 | Destination pin | Hidden | ✓ pulsing |

### 5.2 Label rules (normative)

#### Aisle label

| Property | Rule |
|----------|------|
| **Content** | Aisle number only (`4`, `F` for frozen), or configured aisle name if no number |
| **Placement** | Center of walkable corridor **or** mockup-style at corridor end toward main walk path |
| **Style** | Filled circle + bold numeral; min 44 px equivalent diameter at render scale |
| **Never** | On shelf polygon, on gondola face, or duplicated per bay |

#### Shelf label (map)

| Property | Rule |
|----------|------|
| **Browse mode** | **Do not render** shelf labels |
| **Guided mode** | Show **only the target shelf** |
| **Content** | Bay identifier **without aisle prefix**: `A`, `B`, `3`, `AA` — derived from `shelfIndexAlongAisle` or `displayNumber`, not `aisleShelfLabel()` |
| **Example** | Aisle 4, bay A → map shows **`A`** on target shelf; dock shows **`Aisle 4 · Shelf A`** |

#### Dock / text directions (unchanged concept, clearer copy)

| Field | Example |
|-------|---------|
| Lead | “Start at the entrance, then walk into **Aisle 4**.” |
| Where | “Find shelf **A** — Eye level, position 3.” |
| Tags | `📍 Shelf A` · `Eye level` · `~12 m` |

**Implementation note:** Keep `placementIndex` / `shelfDisplayLabel` for staff tools; add `kioskMapShelfLabel(shelf, aisles)` that strips aisle prefix.

---

## 6. Target route visual specification

### 6.1 Geometry (keep current algorithm, adjust presentation)

Keep `computeShopperRoute` / aisle graph / collision checks. Presentation changes only unless testing finds geometric bugs.

| Segment | Expected visual |
|---------|-----------------|
| Entrance → aisle | Short orthogonal connector along main walk path |
| Along aisles | Follow corridor centerline (within runway band) |
| Final approach | Short connector from centerline to shelf front **left edge** (customer-facing side) |
| End cap | Pin at shelf face; route terminates at pin base, not shelf centroid |

**Acceptance:** Route polyline vertices all lie in corridor union ∪ entrance plaza ∪ 0.3 m approach buffer; no segment crosses shelf interior (existing tests).

### 6.2 Stroke styling (screen-relative, not meter-relative)

Mockup reference: amber dashed path, ~6 px stroke, glow underlay, animated dash march.

| Property | Target | Rationale |
|----------|--------|-----------|
| Min screen stroke | **≥ 8 px** at 1080p (scale with SVG `viewBox` → compute `strokeWidth` in user units from rendered size) | Current meter-based width is too thin |
| Halo | White/light glow, 2.5× main width, 40% opacity | Separates route from grey corridor |
| Color | `--face-a` (brand orange) main; `--face-a-deep` chevrons | Matches ShelfPilot brand |
| Dash | **Pixel-stable** dash pattern (e.g. 12 px / 8 px) via `vector-effect` or computed from viewBox | Meter dashes vanish when zoomed out |
| Animation | `stroke-dashoffset` march when `prefers-reduced-motion: no-preference` | Motion draws eye along path |
| Chevrons | Every ~80 px along path | Direction hint |
| Turn nodes | Small white dots at orthogonal bends | Mockup-style clarity |
| Start | Brand dot + “Start” pill at entrance | Already partially implemented |

### 6.3 Z-order fix

Route layer must render **above** shelf fills and corridor fills, **below** aisle badges and target shelf label.

### 6.4 View framing

| Mode | ViewBox |
|------|---------|
| Browse | Full store with 5% padding; optional max scale cap so aisles stay readable |
| Guided | `focusViewBoxForRoute` including entrance, full route, target shelf, **and** 15% margin; min span prevents over-zoom on short routes |

---

## 7. Target 2D map modes

### 7.1 Mode A — Browse (no product selected)

**Purpose:** Orient the customer; support “where is aisle 5?” without product context.

| Element | Shown |
|---------|-------|
| Store outline | ✓ |
| Aisle corridors | Light grey fill |
| Aisle badges | All aisle numbers |
| Shelves | Simple white/grey blocks, **no text** |
| Route | Hidden |
| Copy | “Tap a product to see your route.” |

Optional enhancement: tapping an aisle badge filters product list (out of scope v1 unless requested).

### 7.2 Mode B — Guided (product selected)

**Purpose:** Walk the customer to the product.

| Element | Shown |
|---------|-------|
| Target aisle | Brand-tinted corridor |
| Target shelf | Brand border + light fill |
| Other fixtures | Dimmed (40% opacity) |
| Route | Full animated path |
| Target shelf label | Bay letter only |
| Pin | Pulsing at shelf front |

### 7.3 Mode C — Guide overlay (full-screen)

Split panel from mockup: **left = zoomed route map**, **right = shelf elevation** (`ShopperShelfGuide`).

Improvements needed:

| Issue | Target |
|-------|--------|
| Map panel too small on some breakpoints | Min height 46 vh; route re-framed for panel |
| Step copy | Numbered steps mirroring `buildAisleWalkSteps` output |
| Consistency | Same route styling as inline map |

---

## 8. Schematic simplification option (recommended v2)

Real layouts with rotation and L-shaped polygons will always feel “CAD-like”. Two approaches:

| Option | Description | Effort |
|--------|-------------|--------|
| **B1 — Label & route polish only** | Keep exact footprints; fix labels + route styling | Small |
| **B2 — Schematic projection** | Derive axis-aligned “strip” per aisle from bounds (mockup-like); snap route to strip center | Medium |
| **B3 — Dual renderer** | Editor fidelity vs kiosk schematic toggle in admin | Large |

**Recommendation:** Ship **B1** immediately; prototype **B2** on demo layout and compare in user testing.

Schematic strip rules (B2):

- Each aisle → one vertical or horizontal bar in corridor bounds
- Shelves → equal-width ticks on bar sides (no rotation on map)
- Category color from dominant category on aisle (optional)

---

## 9. Mockup vs implementation gap matrix

| Mockup feature | Mockup | Current | Target |
|----------------|--------|---------|--------|
| Colored category zones | ✓ | ✗ | Optional phase 2 |
| Aisle number placement | Below corridor | Corridor center | Corridor end or center (pick one; **not on shelf**) |
| Shelf labels on map | Hidden | All faces | Hidden / target only |
| Route width | Thick, amber | Thin, orange | Thick, pixel-scaled |
| Route animation | Visible dash flow | Often invisible | Pixel-stable animation |
| Frozen wall banner | ✓ | ✗ | If layout has frozen zone |
| Entrance | “YOU ARE HERE” | “Entrance” pill | Stronger entrance branding |
| 2D shelf guide | ✓ | ✓ (real planogram) | Keep; align header copy |

---

## 10. Functional requirements

### FR-MAP-01 — Customer map label profile

**Given** the Store Finder map in customer mode  
**When** the map renders shelf faces  
**Then** labels must not include the aisle number prefix  
**And** browse mode must not render shelf labels  
**And** guided mode must render at most one shelf label (target bay)

### FR-MAP-02 — Aisle badge exclusivity

**Given** an aisle with number `N`  
**When** the map renders  
**Then** `N` appears exactly once per aisle in the walkable corridor  
**And** never on a shelf polygon

### FR-MAP-03 — Route visibility

**Given** a product with a valid placement and route  
**When** guided mode is active  
**Then** the route stroke is ≥ 8 px on a 1080p display  
**And** the route is visually above shelf fills  
**And** animated dash motion is visible OR a static high-contrast pattern is used when reduced motion is preferred

### FR-MAP-04 — Route readability test

**Given** the demo layout seed  
**When** a customer selects any in-stock product  
**Then** the route is visible without manual zoom  
**And** automated tests confirm no shelf interior intersection

### FR-MAP-05 — Direction copy consistency

**Given** a selected product  
**When** dock and overlay text render  
**Then** aisle number appears in text chrome  
**And** shelf bay appears without repeating aisle number in the map graphic

### FR-MAP-06 — Focus framing

**Given** guided mode  
**When** the route is computed  
**Then** the viewBox includes entrance, entire route, target shelf, and margin  
**And** the target shelf occupies roughly 15–30% of map height

---

## 11. Non-functional requirements

| ID | Requirement |
|----|-------------|
| NFR-1 | Map render < 100 ms for layouts ≤ 200 shelves (client-side) |
| NFR-2 | WCAG: route not color-only (dash + chevrons + text dock) |
| NFR-3 | `prefers-reduced-motion`: disable dash animation; keep static dashed line |
| NFR-4 | Touch targets on product list unchanged; map is display-only v1 |

---

## 12. Proposed implementation plan

### Phase 1 — Quick wins (1–2 days)

| Task | Files |
|------|-------|
| Add `kioskShelfBayLabel()` (strip aisle prefix) | `shopperSchematicMap.js` or new `shopperMapLabels.js` |
| Browse vs guided label gating | `ShopperFloorMap.jsx` |
| Pixel-scaled route width + dash | `ShopperFloorMap.jsx` (`RouteLayer`), `styles.css` |
| Raise route z-index above shelves | `ShopperFloorMap.jsx` render order |
| Aisle badge size floor (px equivalent) | `schematicAisleFontSize`, CSS |

### Phase 2 — UX polish (2–3 days)

| Task | Files |
|------|-------|
| Stronger entrance / “You are here” | `ShopperFloorMap.jsx`, CSS |
| Guide overlay map framing | `ShopperKioskPage.jsx` |
| Step list from `buildAisleWalkSteps` in overlay | `ShopperKioskPage.jsx` |
| Category zone tints (optional) | `shopperSchematicMap.js` |

### Phase 3 — Schematic renderer (spike)

| Task | Files |
|------|-------|
| Aisle strip projection | new `shopperSchematicLayout.js` |
| Feature flag `kioskSchematicMap` | env or layout meta |

### Tests to add/update

| Test | File |
|------|------|
| `kioskShelfBayLabel` strips aisle prefix | `shopper-schematic.test.js` |
| Browse mode emits no shelf labels | component or unit test |
| Route stroke width ≥ min for sample viewBox | unit test |
| Existing wayfinding collision tests | keep green |

---

## 13. Open questions

| ID | Question | Default if unanswered |
|----|----------|------------------------|
| OQ-1 | Aisle badge at corridor **center** vs **end toward entrance**? | Center (current), larger badge |
| OQ-2 | Show category colors on map for demo? | Yes for aisles with dominant category |
| OQ-3 | Show all shelf bays when zoomed tight? | No — target only |
| OQ-4 | B2 schematic vs B1 polish first? | B1 first |
| OQ-5 | Should double-sided gondola show `A`/`B` on map or only in shelf guide? | Only target face in guided mode |

---

## 14. Out of scope

- Turn-by-turn voice navigation
- Live positioning / BLE
- Multi-floor malls
- Customer editing of entrance point
- 3D walk mode (separate FR)

---

## 15. Appendix A — Label examples

| Layout data | Editor label (`shelfFaceDisplayLabel`) | **Wrong on map** | **Correct map (guided)** | **Dock text** |
|-------------|----------------------------------------|------------------|--------------------------|---------------|
| Aisle 4, index 0 | `4A` | Pill `4A` on shelf | Pill `A` on target only | Aisle 4 · Shelf A |
| Aisle 4, index 1 | `4B` | Pill `4B` | Pill `B` | Aisle 4 · Shelf B |
| Gondola pair | `4A` / `4C` | Both with aisle prefix | Target face only | Aisle 4 · Shelf A |
| No aisle number | `AA` | `AA` | `AA` | Shelf AA |

---

## 16. Appendix B — Route visibility checklist (QA)

Manual test on `http://localhost:8080` after implementation:

- [ ] Select product in demo layout — route visible from 1 m without leaning in
- [ ] Route does not disappear under white shelf fill
- [ ] Animation visible on route (or static dashes if reduced motion)
- [ ] No aisle number pills on non-target shelves
- [ ] Target aisle corridor highlighted
- [ ] Pin sits on customer-facing shelf edge, not in aisle center
- [ ] Guide overlay map shows same route styling as dock map
- [ ] Clear search resets to browse mode (no route, no shelf labels)

---

## 17. Document history

| Version | Date | Author | Notes |
|---------|------|--------|-------|
| 0.1 | 2026-08-13 | Engineering | Initial draft from customer feedback + code/mockup review |
