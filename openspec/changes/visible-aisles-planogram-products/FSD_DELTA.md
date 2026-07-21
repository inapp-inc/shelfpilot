# FSD delta — visible-aisles-planogram-products

Target: `Docs/FSD_ShelfPilot.md`

## Epic F3 — Smart Autogenerate (MODIFY)

- Generated aisles now carry an explicit `orientation` (`horizontal` | `vertical`).
- Autogenerate guarantees walkable spacing: aisle bands use the effective minimum
  aisle width, clamped to a walkable minimum (default ≥ 0.9 m).
- Autogenerate response and the editor toast report the **aisle count** in addition to
  shelves and skipped-outside count.

## Epic C — Layout Editor / Canvas (MODIFY)

- Aisles render as clearly visible **walkways** (legible fill + dashed border +
  `Aisle N` label), sized and oriented from `orientation` / `lengthMeters` /
  `widthMeters`. Vertical aisles draw along their run (taller than wide) instead of
  sideways.

## Epic F4 — Planogram / Merchandising (MODIFY)

- The layout-editor planogram product picker reflects the **current catalog**: the
  catalog reloads when the editor opens and after a catalog import, so imported/updated
  products are immediately placeable.
- Picker shows a product count and explicit empty-states ("assign a category to this
  face" vs "no products in category") with a refresh action.

## Epic C — Layout Editor / Zones & Entry points (ADD)

- Layouts gain **special zones** (`hot`, `offer`, `special`) that a Designer draws
  inside the polygon and edits (name, type, color). Zones are merchandising overlays
  that do not block fixture placement and survive autogenerate. `special` + custom name
  supports user-defined zones (e.g. "Clearance", "Seasonal").
- Layouts gain **entry points** placed by the Designer, shown as door/arrow markers,
  capturing store entrances for traffic-flow context.

## OpenAPI (additive — patch/minor)

- `Aisle`: add optional `orientation: horizontal|vertical`.
- `POST /layouts/{id}/autogenerate` response `generated`: document `aisles` count
  (already returned) alongside `shelves` and `skippedOutsideCount`.
- `Layout`: add optional `zones[]` (`{ id, type, name?, color?, x, y, widthMeters,
  depthMeters }`) and `entryPoints[]` (`{ id, name?, x, y, widthMeters }`).
- New endpoints: `zones` and `entry-points` CRUD under `/layouts/{id}`.
