# Proposal: Merchandising products, planogram suggestions, visible aisles, dual-face storage

**Status:** Approved / Implemented — 2026-07-22

**Source:** Layout design / merchandising feedback after catalog import and autogenerate.

## Summary

Four related gaps block end-to-end merchandising on generated layouts:

1. **Products added under a category do not appear** in the Layout Editor Merchandising panel after assigning that category to a shelf.
2. **No guidance on how many units fit** on a shelf — users need suggested **front facings** (width), **depth** (backward/backstock), and **levels** (height) when picking a product.
3. **Aisles from autogenerate are not visible** (or appear missing) on the 2D canvas after generating a layout.
4. **Storage shelves are double-sided** — both sides need separate shelf numbers (**1A / 1B**) and independent category/product mapping per face.

This change closes the catalog → category → product → planogram loop, improves aisle readability, and treats **storage** fixtures as dual-face like gondolas.

## Client requests (traceability)

| # | Client ask | Problem today |
|---|------------|---------------|
| 1 | Select category on shelf → **list products** from that category | Catalog load filtered by `?vertical=` on products API can miss newly imported rows; stale catalog in editor; Face B mapping dropped `faceId` on map |
| 2 | **Suggest how many products fit** (facings + backward depth) | Preview API returned only `maxFacings`; UI showed a single number |
| 3 | **Aisles not showing** on generated layouts | Low-contrast rendering; aisles outside fixture polygon hidden; overlap filter may drop aisles that intersect shelf footprints |
| 4 | **Storage = two faces** with separate products | Only `gondola` was treated as double-sided; badge/merch UI said “Gondola” for all dual-face shelves |

## Deliverables

### 1. Category → product listing (Merchandising)

- Load **all products** from API, then filter client-side to categories belonging to the layout vertical (includes subcategories via descendant tree).
- **Refresh catalog** when opening Merchandising on a shelf and via explicit Refresh button (after Excel import / quick-add).
- Fix **Face B category mapping** — pass `faceId` through `onMapShelf` → API PATCH.
- Empty states distinguish “no category assigned” vs “no products in category” with Refresh + quick-add affordance.

### 2. Planogram arrangement suggestions

- Extend planogram preview with:
  - `maxFacings` — units across shelf width (front)
  - `maxDepthFacings` — units deep (backward / backstock) from shelf depth vs product depth
  - `suggestedLevels` — vertical stack count from shelf height vs product height
- Merchandising panel shows all three suggestions when a product is selected; default facings input prefilled from preview.

### 3. Visible aisles on generated layouts

- Canvas: stronger aisle styling (fill + dashed border + label), filter to aisles **inside fixture polygon** (same containment rules as shelves).
- Autogen: preserve aisles that fit; overlap post-filter drops **overlapping aisles** (keeps shelves) — report aisle count in generate toast.
- Verify mixed-orientation and portrait layouts still show walk corridors.

### 4. Dual-face storage shelves

- API: `isDoubleSidedType("storage")` → `doubleSided: true`, faces A/B with independent categories and planograms.
- Canvas badge: `{displayNumber}A` / `{displayNumber}B` on storage and gondola.
- Merchandising: Face A/B toggle for storage; label reads “Storage (A/B)” not “Gondola”.

## SEED units

| ID | Scope |
|----|-------|
| SEED-LM-01 | Catalog load + client filter; refresh on shelf select; faceId map fix |
| SEED-LM-02 | Planogram depth/level suggestions (API + Merchandising UI) |
| SEED-LM-03 | Aisle visibility + polygon filter on canvas |
| SEED-LM-04 | Storage dual-face (API normalize + badge + merch UI) |
| SEED-LM-05 | Tests, OpenAPI delta, verification checklist |

## Success criteria (verification)

- Import or add products under category **C** → open layout → assign **C** to shelf Face A → product picker lists all products in **C** and child categories.
- Select a product → panel shows **front facings**, **depth (backward)**, and **levels** suggestions before Add.
- Autogenerate on a wide layout → **aisles visible** between shelf blocks; toast reports aisle count > 0 when corridors exist.
- Place **storage** shelf → badge shows **3A** and **3B**; Face B can map a different category and place different products.
- API tests pass; web build succeeds.

## Non-goals

- Automatic planogram fill (AI placement of all SKUs) — suggestions only; user confirms facings.
- Separate physical shelf entities for A/B — still one fixture, two logical faces.
- 3D aisle mesh redesign (2D visibility is in scope; 3D follows existing aisle rendering).

## Relationship to prior changes

| Prior change | Relationship |
|--------------|--------------|
| visible-aisles-planogram-products | Aisle styling and catalog refresh baseline |
| dual-face-numbered-shelves-strict-polygon | Face A/B model; extend to storage type |
| layout-client-feedback | Category fixture types (produce → storage) |
| catalog-merch-ui-v2 | Excel import; this change ensures import reaches editor |

See [design.md](./design.md) and [tasks.md](./tasks.md) for implementation detail and verification steps.
