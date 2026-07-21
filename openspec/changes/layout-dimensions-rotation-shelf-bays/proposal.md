# Proposal: Layout dimensions, containment, rotation & shelf bays

**Status:** Approved 2026-07-21 — implemented

## Summary

Follow-up to canvas/zoom/zone work. Users need clearer **dimension readouts**, reliable
**polygon containment** (no shelves outside the drawn area), **free shelf rotation**,
**readable dual-face numbers on small fixtures**, and **shelf bay splitting** so planogram
capacity follows physical segments of a shelf run.

## Problems today

| # | Problem | Current behaviour |
|---|---------|-------------------|
| 1 | Aisle space not obvious | Aisles render as walkways but **run length × width** is only in hover `title`; no on-canvas dimension labels |
| 2 | Shelf dimensions hidden | Properties panel shows W/D inputs; canvas shows **number badges only**, no `1.2 m × 0.6 m` readout |
| 3 | Shelves outside drawn area | Strict containment exists in API (`containment_violation`) but **client drag** only clamps `x,y ≥ 0`; shelves can be dragged/placed outside irregular polygons; outside shelves are **hidden** on canvas (`visibleShelves` filter) but remain in layout data |
| 4 | Rotation limited | `rotationDeg` exists but footprint math and canvas drawing only handle **0° / 90° / 270°**; no UI to rotate freely |
| 5 | Small shelf numbers | Dual-face `12A` / `12B` badges clip or overlap on narrow/short fixtures |
| 6 | No shelf splitting | Planogram uses full `usableWidthMeters`; no way to **split a shelf into bays** with independent fill (full vs partial) sized to product dimensions |

## Deliverables

### 1. Dimension overlays (aisles + shelves)

- Selected aisle: show **`{runLength} m × {width} m`** on canvas (centred label + selection bar).
- Selected shelf: show **`{usableWidth} m × {depth} m`** (and height in Properties).
- Aisle walkways: persistent secondary label **`{width} m`** on each aisle (not only hover).
- Meter bar / selection bar echo the same values for accessibility.

### 2. Polygon containment hardening

- Client-side drag preview SHALL reject positions where the shelf/aisle footprint is
  not fully inside the drawn polygon (mirror server `entityInsideLayout`).
- Placement (click/drop) SHALL block outside-polygon drops with a toast (already partial).
- Autogenerate + manual PATCH remain server-authoritative; validation banner lists
  **count + ids** and offers **Select first violation** action.
- Fix: stop silently hiding outside shelves — show them with **violation outline** until
  moved or deleted.

### 3. Arbitrary shelf rotation

- Accept `rotationDeg` **0–359** (integer or 0.5° steps — see REVIEW.md).
- Footprint containment uses **rotated rectangle corners** (all four corners inside polygon).
- Canvas: CSS `transform: rotate(rotationDeg)` with transform-origin top-left; drag
  handle preserves rotation.
- Properties: rotation input + **90° snap** button + drag handle on selected shelf.
- 3D: apply equivalent Y-axis rotation on shelf mesh.
- Autogen continues 0° / 90° only (out of scope to rotate generated rows arbitrarily).

### 4. Improved shelf number badges

- Scale badge font from fixture pixel size (min 8px, max 11px).
- Dual-face: vertical stack or corner badges when width &lt; 48px; tooltip with full
  `#12 Face A → Category`.
- Optional **mirror label** on opposite long edge for gondolas (both sides readable in 2D).

### 5. Shelf bay split & fill mode

- New optional `segments[]` on a shelf (merchandising, not separate fixtures):

  | Field | Purpose |
  |-------|---------|
  | `id` | Stable segment id |
  | `offsetMeters` | Start along usable width from shelf origin |
  | `widthMeters` | Segment run width |
  | `fillMode` | `full` \| `partial` — visual + planogram hint |

- Designer actions: **Split shelf** (equal N bays or custom widths), **Merge segments**,
  per-segment fill toggle.
- Planogram facing capacity computed per **segment width**, not full shelf width.
- Segments sum ≤ `usableWidthMeters`; gaps allowed when `fillMode: partial`.
- Canvas: faint vertical dividers between segments on selected shelf.

## SEED units

| ID | Scope |
|----|-------|
| SEED-LD-01 | Dimension overlays — canvas labels, selection bar, aisle width tags |
| SEED-LD-02 | Containment hardening — client drag, violation styling, no silent hide |
| SEED-LD-03 | Arbitrary rotation — footprint math, API validation, canvas + 3D |
| SEED-LD-04 | Shelf badge readability — responsive dual-face labels + legend tooltips |
| SEED-LD-05 | Shelf segments model + API + OpenAPI |
| SEED-LD-06 | Bay split UI + segment-scoped planogram + fill mode |
| SEED-LD-07 | Tests, spec fold, FSD/OpenAPI delta, handover touch-up |

## Success criteria

- Select an aisle → run length and width visible on canvas without hover.
- Select a shelf → W×D visible on canvas and selection bar.
- Drag a shelf toward polygon edge → it **stops** at boundary; PATCH never needed to
  discover violation.
- Shelves outside polygon show **red violation outline** (not invisible).
- Rotate a shelf to 45° → saves, renders in 2D/3D, containment uses rotated footprint.
- Split a 3.6 m shelf into 3 × 1.2 m bays → planogram on bay 2 uses 1.2 m width for
  max facings.
- Toggle `partial` fill → UI shows unused segment space; full fill uses entire segment width.
- All existing tests pass + new rotation, containment, segment tests.

## Non-goals (this change)

- Splitting aisles into segments (aisles stay single run).
- Auto-splitting shelves from product mix during autogenerate (manual/UI-driven only in v1).
- Structural collision detection between overlapping shelves (only polygon containment).
- Curved or multi-segment shelf geometry (rectangles only).

## Relationship to prior changes

| Prior change | Relationship |
|--------------|--------------|
| dual-face-numbered-shelves-strict-polygon | Extends badges + strict polygon; completes containment UX |
| visible-aisles-planogram-products | Builds on aisle rendering; adds dimension labels |
| layout-editor-planogram | Extends planogram to segment-scoped capacity |

See [REVIEW.md](./REVIEW.md) for decisions needed before implementation.
