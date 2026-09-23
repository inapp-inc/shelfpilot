# Store Finder — multi-spot product search

**Status:** Implemented  
**Date:** 2026-09-17  
**Traceability:** FR-CUST-01 · `Docs/SHOPPER_KIOSK_2D_MAP_UX_SPEC.md`  
**Code:** `ShopperKioskPage.jsx`, `shopperKioskHelpers.js`, `ShopperLayoutPlanMap.jsx`, `ShopperFloorMap.jsx`, `mapLayers.jsx`

---

## 1. Problem

When the same SKU appears on **more than one shelf** (different aisles, bays, or levels), the kiosk previously:

- Highlighted **one** shelf at a time (tabs: “Spot 1”, “Spot 2”).
- Drew a walking route only to the **first** placement.
- Hid other locations until the shopper discovered the tabs.

Shoppers need to see **every in-store location at once**, then optionally focus one spot for turn-by-turn walking.

---

## 2. Requirements

| ID | Requirement |
|----|-------------|
| MS-01 | Selecting a product with N placements shows **N numbered markers** on the map simultaneously. |
| MS-02 | Markers use **readable labels** in the chrome (aisle + bay), not only “Spot 1”. |
| MS-03 | Default walking route targets the **nearest** placement from the configured entrance. |
| MS-04 | Tapping another location re-draws the route to **that** shelf; the active marker is visually primary. |
| MS-05 | Plan map **does not dim** other locations that also carry the product. |
| MS-06 | Map frame includes **all** marker positions (plus entrance) when multiple spots exist. |
| MS-07 | Search dropdown shows **placement count**; single-aisle summary is not shown when count > 1. |

---

## 3. UX behaviour

### 3.1 Search result row

- `placementCount > 1` → badge **“N locations”** (no misleading single aisle line).
- `placementCount === 1` → aisle / shelf summary unchanged.

### 3.2 After selection

- **Store plan only** (no simple layout map toggle).
- Compact header; **map uses maximum viewport** with floating product chip + legend.
- **All walking routes** from entrance to every location draw at once.
- Numbered pins on every shelf; **tap a pin** to open the **shelf level** panel (no location chip row).
- Single-location products show the level panel automatically.

### 3.3 Map legend

- Guided + multi-spot: third legend item reads **“Numbered = all locations”**.

---

## 4. Technical notes

- Highlight set: physical shelf ids resolved via `mapHighlightShelfId` (merged gondola faces).
- Markers: `buildShelfMarkersForPlacements()` → `ShelfTargetMarker` with `spotIndex` and `variant`.
- Framing: `expandViewBoxForPoints` over entrance + all badge points + route when `markers.length > 1`.
- Nearest spot: shortest `computeShopperRoute` path length among placements.

---

## 5. Acceptance

1. Demo layout with one product on ≥2 shelves → both markers visible without switching tabs.
2. Route length updates when a different location chip is selected.
3. Vitest: `placementSpotLabel`, `nearestPlacementFromEntry` (minimal layout fixture).
