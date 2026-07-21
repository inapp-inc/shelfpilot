# Proposal: Visible generated aisles + updated products in planogram

**Status:** Implemented — 2026-07-20

## Summary

Follow-ups after the dual-face / strict-polygon work landed:

1. **Aisles are generated but not visible / not spaced clearly.** Autogenerate does
   create aisle rows between shelf blocks, but on the 2D canvas they render as a
   near-invisible 20%-gray strip with a tiny label, so users read the layout as a
   solid block of shelves with "no aisles". For **vertical** (portrait) layouts the
   aisle footprint is computed with swapped dimensions, so vertical aisles can also
   be dropped or drawn in the wrong direction.
2. **Imported / updated products don't appear in the layout-editor planogram.**
   After importing products from Excel (or editing the catalog), the merchandising
   planogram picker on the layout editor can keep showing a stale list, so newly
   added products can't be placed on a shelf face.

This change makes generated aisles **clearly visible with real walking space** (both
orientations) and guarantees the planogram product picker **always reflects the
current catalog** for the layout's vertical.

It also adds **special zones** (hot zones, offer zones, and user-defined custom
zones) and **store entry points** so a layout can capture merchandising intent and
traffic-flow context, not just fixtures.

## Deliverables

### 1. Visible, correctly-oriented aisles

- Autogen tags each aisle with an explicit `orientation` (`horizontal` | `vertical`)
  matching the run direction.
- `aisleFootprint` becomes orientation-aware so containment no longer drops or
  mis-sizes vertical aisles.
- Canvas renders aisles as a distinct **walkway**: solid, readable fill + dashed
  border + centered label, sized by run length × aisle width, oriented correctly.
- Guarantee visible gaps: enforce the configured minimum aisle width as real space
  between shelf blocks, and report `aisleCount` in the generate toast.

### 2. Updated products listed in the planogram

- Layout editor reloads the catalog for the layout's vertical when the editor opens
  and after a catalog import completes, so the planogram picker is never stale.
- Merchandising planogram picker shows a clear count and empty-state that
  distinguishes "no category assigned to this face" from "no products in category",
  with a one-click refresh.
- Product filtering keeps face-scoping (category + descendants) but tolerates newly
  imported products whose category was auto-created during import.

### 3. Special zones (hot / offer / custom)

- New layout collection `zones[]`, each with `id`, `type`
  (`hot` | `offer` | `special`), an optional custom `name`/`label` (so a user can
  define their own zone, e.g. "Seasonal", "Clearance"), a `color`, and a footprint
  (rectangle `x/y/widthMeters/depthMeters`, oriented to the drawn polygon).
- Zones are **defined by the user** on the canvas via a zone palette tool (draw a
  rectangle inside the drawn area) and are editable in a side panel (rename, recolor,
  change type, delete).
- Zones are **overlays**: they annotate the floor for merchandising/traffic intent and
  do **not** block or replace aisle/shelf placement. They must stay inside the drawn
  polygon (strict containment, like fixtures).

### 4. Store entry points

- New layout collection `entryPoints[]` (at least one supported), each with `id`,
  optional `name`, a position on the polygon boundary/floor (`x/y`), and a `widthMeters`.
- Entry points are placed via an "Entry" palette tool and shown as a distinct marker
  (door/arrow) on the canvas edge.
- Entry points are metadata for traffic-flow context (and future autogen hints); they
  do not change fixture packing in this change.

## SEED units

| ID | Scope |
|----|-------|
| SEED-VA-01 | Aisle `orientation` field + orientation-aware `aisleFootprint` (API) |
| SEED-VA-02 | Autogen: tag aisle orientation, guarantee spacing, report `aisleCount` |
| SEED-VA-03 | Canvas: visible walkway rendering for both orientations |
| SEED-VA-04 | Layout editor: refresh catalog on open + after import; planogram picker states |
| SEED-VA-05 | Zones model + API (CRUD, containment) + OpenAPI |
| SEED-VA-06 | Entry points model + API + OpenAPI |
| SEED-VA-07 | Canvas + side panel UI: draw/edit zones and entry points |
| SEED-VA-08 | Tests, spec fold, FSD/OpenAPI delta |

## Success criteria

- Generate on a wide layout → aisles are **clearly visible** between shelf rows with
  real space; generate on a tall/portrait polygon → vertical aisles show correctly.
- Generate toast reports both shelf **and** aisle counts.
- Import products from Excel → open a layout → assign a category to a shelf face →
  the imported products appear immediately in the planogram picker.
- Draw a **hot / offer / custom** zone inside the polygon → it persists, is editable
  (name/type/color), and stays inside the drawn area.
- Place an **entry point** → it shows as a marker on the canvas and persists on the layout.
- All existing tests pass + new aisle-orientation, catalog-refresh, zone, and entry-point tests.

## Iteration 2 (2026-07-20) — autogen rework + planogram mapping

Follow-up after review feedback. See [ANALYSIS.md](./ANALYSIS.md) for the full
root-cause write-up. Summary of additional work:

1. **Aisles now generate on drawn polygons** — root cause was a fixed left-anchor aisle
   placement that failed on irregular shapes; replaced with **scan-based inside-run
   aisle detection** (`insideRunsAlongX` / `insideRunsAlongY`).
2. **Mixed orientation** — new `mixed` mode packs both horizontal rows and vertical
   columns of shelves (split along the longer axis with a corridor between). Now the
   editor default.
3. **Products list under categories** — autogenerate builds its category mix from the
   **real loaded catalog** (`mixFromCategories`) instead of static template ids, so
   shelves get category ids that actually own products.
4. **Drawn area alignment** — removed the rectangular canvas border in polygon mode so
   only the polygon outline defines the boundary.
5. **Zoom to 500%** — base scale increased and zoom range raised to 0.5–5× with Reset.

## Iteration 3 (2026-07-20) — delete shelves/aisles + selection UX

Follow-up requested for the client demo:

1. **Delete shelves and aisles** — previously only zones and entry points could be
   removed. Added `DELETE /layouts/{id}/aisles/{aisleId}` and
   `DELETE /layouts/{id}/shelves/{shelfId}` (Designer/Admin). Deleting an aisle also
   clears its `aisleMappings` and detaches any `shelf.aisleId` that referenced it;
   deleting a shelf also clears its `shelfMappings`.
2. **Selection → delete affordances** — selecting any shelf/aisle/zone/entry point
   shows an always-visible **selection bar** above the canvas (kind + label +
   `Delete` / `Deselect`), the Properties panel gains a **Delete shelf / Delete aisle**
   button, and **Delete / Backspace** removes the current selection (ignored while
   typing in inputs). All deletes confirm first.
3. **UI alignment polish** — consistent `btn-danger` styling, meter-bar wraps cleanly
   at high zoom, selection bar, and catalog import copy updated for the store-type dialog.

## Relationship to recent work

| Prior change | Relationship |
|--------------|--------------|
| dual-face-numbered-shelves-strict-polygon | Builds on strict polygon packer/canvas; fixes aisle rendering it introduced |
| module-reframe-smart-autogen | Extends smart generate reporting (aisle count) |
| catalog-merch-ui-v2 / Excel import | Ensures imported catalog reaches the editor planogram |

See [REVIEW.md](./REVIEW.md) for decisions.
