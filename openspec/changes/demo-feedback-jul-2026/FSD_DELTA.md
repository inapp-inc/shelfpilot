# FSD delta — demo-feedback-jul-2026

Target: `Docs/FSD_ShelfPilot.md` — fold after approval

## Epic C — Layout Editor / 2D floor plan (MODIFY)

- The 2D floor plan SHALL use **WebGL** (Three.js orthographic) as the primary renderer for fixture alignment, zoom, and picking; legacy DOM canvas MAY remain behind a feature flag until parity is verified.
- Shelves and aisles SHALL align to the scaled metre grid with no visible drift at standard zoom levels (50%–400%).

## Epic C — Layout Editor / Shelf & aisle identity (MODIFY)

- Walk aisles SHALL expose a numeric **aisle number** (1-based) visible on the canvas.
- Shelf labels SHALL follow **aisle-centric numbering**: `{aisleNumber}{letter}` (e.g. aisle 4 → **4A**, **4B**, **4C**).
- Dual-face gondola back faces SHALL use the **opposite aisle** number (e.g. **5A**, **5B** when aisle 5 is behind the spine).
- Selection, Properties, Merchandising, Planogram, and legend SHALL show the same label for a given shelf face.

## Epic C — Layout Editor / Store envelope (MODIFY)

- Designers SHALL enter and edit **store width and depth** (metres) from the editor toolbar; changes SHALL live-update the store envelope rectangle on canvas.
- Fixture polygon editing remains separate; polygon MUST stay inside the envelope.

## Epic C — Layout Editor / Merchandising preview (ADD)

- Hovering a shelf face in 2D SHALL show a tooltip with face label, category, and listed products (up to 8, with overflow count).

## Epic F3 — Smart Autogenerate (MODIFY)

- Autogenerate SHALL assign aisle numbers, bind shelf faces to aisles, and apply aisle-centric labels.
- Packing quality SHALL eliminate visible gaps between shelves and aisles; product fill coverage SHALL be reported in the UI.

## Epic B — Dashboard (MODIFY)

- Dashboard SHALL present portfolio **status pipeline** (draft / in review / approved / rejected), a **featured layout** preview, quick actions, and recent layouts — optimised for stakeholder demo walkthrough.
- Deep per-layout analytics MAY be condensed; full charts remain accessible when a layout is selected.

## OpenAPI (additive)

- `Aisle.aisleNumber` (integer)
- `Shelf.shelfIndexAlongAisle` (integer)
- Optional `GET /analytics/portfolio/summary`

## Acceptance additions

| ID | Criterion |
|----|-----------|
| DF-AC-1 | Aisle 4 shelves labelled 4A, 4B; click shows same in Properties |
| DF-AC-2 | Dual-face back shows opposite aisle label (e.g. 5A not 4A) |
| DF-AC-3 | WebGL 2D: select/drag shelf works; labels readable at 100% zoom |
| DF-AC-4 | Edit store W×D in toolbar → envelope updates on canvas |
| DF-AC-5 | Hover shelf → product list within 500 ms |
| DF-AC-6 | Smart Generate reports product fill %; 0 outside polygon |
| DF-AC-7 | Dashboard shows status pipeline + featured layout card |
