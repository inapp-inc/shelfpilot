# Proposal: Demo enhancements — canvas resize, layout delete, dashboard charts, product images, 3D images

**Status:** Proposed — 2026-07-20
**Requested by:** Client demo feedback (2026-07-20)

## Summary

A batch of enhancements requested after the layout-editor selection/delete work landed.
They span the layout editor, the layouts portfolio, the dashboard, the catalog, and the
3D viewer:

1. **Resize zones and aisles directly on the canvas** (drag handles in edit mode).
2. **Delete layouts** from the Layouts portfolio screen and from inside the editor.
3. **A richer dashboard** — pick a layout, then see charts: free space, category fill,
   facings, utilization, and fixture/aisle counts.
4. **Product edit screen** — cleaner Save/Cancel UI and an **image upload** field.
5. **Excel import** — support a product **image** column.
6. **3D view** — render **live product images** on shelves instead of plain color blocks.

This document also records the changes already delivered in the current demo cycle (see
[Previously delivered](#previously-delivered)).

## Deliverables

### A. Canvas resize for zones & aisles (edit mode)

- When a **zone** is selected, show 8 resize handles (corners + edges). Dragging updates
  `widthMeters` / `depthMeters` live; release commits via `PATCH /layouts/{id}/zones/{zoneId}`.
- When an **aisle** is selected, show handles to change its **width** and **length**
  (orientation-aware). Release commits via `PATCH /layouts/{id}/aisles/{aisleId}`.
- Resizing is clamped to stay inside the drawn polygon (no containment violation on release);
  a handle that would push the entity outside stops at the boundary.
- Handles only appear for Designer/Admin (edit mode); Viewers see selection only.

### B. Delete layouts (portfolio + editor)

- New `DELETE /layouts/{layoutId}` (Designer/Admin). Cascades: removes the layout and its
  saved versions/snapshots. Unknown id → 404, Viewer → 403.
- **Portfolio:** each layout card gets a delete (trash) affordance with a confirmation; on
  success the card disappears and the list refreshes.
- **Editor:** header gains a **Delete layout** action → confirm → navigate back to
  `/layouts` and refresh the portfolio.

### C. Dashboard with charts + per-layout drill-down

- A **layout picker** on the dashboard. Selecting a layout shows its metrics as charts:
  - **Free space vs used** (donut or stacked bar) — usable floor area filled by fixtures.
  - **Category fill** (donut/bars) — share of shelves/area per category.
  - **Facings by category** (bar) — total planogram facings placed, grouped by category.
  - **Utilization** and **shelves / aisles / mapped-category** counts as KPI cards.
- Charts are lightweight **custom SVG** components (no heavy chart dependency, to keep the
  bundle small — the build already warns at 500 kB).
- Analytics is extended to compute **free space %**, **facings total**, and
  **facings by category** (from planogram placements) alongside the existing utilization
  and category allocation.

### D. Product edit screen — Save/Cancel UI + image upload

- Sticky, consistent footer: **Cancel** (secondary) + **Save product** (primary), aligned
  and full-width on small drawers.
- New **Product image** field: upload a file (drag/drop or browse) with a live thumbnail,
  or paste an image URL. Clear/remove control.
- Image is stored on the product as `imageUrl` (see [design](./design.md) for storage).

### E. Excel import supports images

- Optional `imageUrl` column in the import template and parser. Value is an image URL
  (kept as-is on the product). Blank is allowed.
- Template download includes the `imageUrl` column with an example.

### F. 3D live product images

- In the 3D view, shelves with planogram placements render the **product image** as a
  textured plane on the shelf face (per facing / level), falling back to the category color
  block when a product has no image.
- Images load lazily; missing/broken images degrade gracefully to the color block.

## SEED units

| ID | Scope |
|----|-------|
| SEED-DE-01 | `DELETE /layouts/{id}` (+ version cascade) + OpenAPI + tests |
| SEED-DE-02 | Portfolio delete affordance + confirm + refresh |
| SEED-DE-03 | Editor header Delete layout + navigate back |
| SEED-DE-04 | Canvas resize handles for zones (edit mode) + clamp |
| SEED-DE-05 | Canvas resize handles for aisles (width/length) + clamp; aisle `lengthMeters` PATCH |
| SEED-DE-06 | Analytics: free space %, facings total + by category |
| SEED-DE-07 | Dashboard: layout picker + SVG charts (free space, category fill, facings) |
| SEED-DE-08 | Product `imageUrl` field (model + API) |
| SEED-DE-09 | Product form: Save/Cancel UI polish + image upload/preview |
| SEED-DE-10 | Excel import/template: `imageUrl` column |
| SEED-DE-11 | 3D: product image textures on shelves + fallback |
| SEED-DE-12 | Tests, spec fold, FSD/OpenAPI delta |

## Success criteria

- Selecting a zone/aisle shows resize handles; dragging changes its size and persists;
  it never leaves the drawn polygon.
- A layout can be deleted from both the portfolio and the editor, with confirmation.
- The dashboard lets you pick a layout and shows free-space, category-fill, and facings
  charts plus KPIs; empty layouts render a clear empty state.
- The product edit drawer has a clean Save/Cancel footer and can attach an image shown as
  a thumbnail; the image persists and appears in the catalog.
- Importing an Excel file with an `imageUrl` column attaches images to products.
- Opening 3D on a layout with placed products shows product images on the shelves.

## Open decisions

See [design.md](./design.md). The main one is **image storage** (data URL in SQLite vs
uploaded file served over `/api` vs external URL only). Default proposed:
**client-resized data URL for uploads + accept external URLs**, so it works with the current
SQLite/Docker volume without new static-file plumbing.

## Previously delivered

Delivered earlier in this demo cycle (already implemented; documented here for a complete record):

| Change | What shipped |
|--------|--------------|
| `import-store-type-dialog` | Import dialog to choose store type + drag & drop; parser honors selected vertical instead of defaulting to retail |
| `visible-aisles-planogram-products` (Iteration 3) | Delete shelves & aisles (API + selection bar + Delete/Backspace + confirm); consistent `btn-danger`; meter-bar polish |
| Docker/runtime fixes | `/api` namespacing so client routes survive a refresh (was 401 unauthorized); nginx + vite proxy updated; `--no-cache` rebuild guidance |
| Selection fix | Clicking a shelf/aisle no longer triggers a spurious containment violation or flicker/unselect (click ≠ drag; floor only deselects on empty-floor clicks) |
```
