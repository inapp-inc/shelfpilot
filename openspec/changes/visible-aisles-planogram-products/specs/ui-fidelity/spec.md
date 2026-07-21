## ADDED Requirements

### Requirement: Aisles rendered as visible walkways

The 2D canvas SHALL render each generated aisle as a clearly visible walkway distinct
from shelves: a legible fill, a dashed border, and a centered label (`Aisle N`). The
walkway SHALL be sized and oriented from the aisle's `orientation`, `lengthMeters`, and
`widthMeters`, and SHALL render correctly for both horizontal and vertical aisles.

#### Scenario: Horizontal aisle visible between shelf rows

- **GIVEN** a generated layout with horizontal aisles
- **WHEN** the layout is viewed on the 2D canvas
- **THEN** each aisle is drawn as a labeled walkway with a dashed border, visually
  distinguishable from adjacent shelves

#### Scenario: Vertical aisle drawn along its run

- **GIVEN** a generated layout with `orientation: "vertical"` aisles
- **WHEN** the layout is viewed on the 2D canvas
- **THEN** the aisle is drawn taller than wide (running along Y), not sideways

### Requirement: Zones and entry points rendered on canvas

The 2D canvas SHALL render special zones as translucent tinted rectangles with a
colored dashed border and a label (zone type or custom name), drawn beneath fixtures so
they read as floor overlays. Entry points SHALL render as a distinct marker (door/arrow)
at their position. The editor SHALL provide tools to draw a zone (with a type choice)
and to place an entry point inside the drawn area, and side-rail sections to rename,
recolor, retype, and delete zones and entry points.

#### Scenario: Hot zone shown as labeled overlay

- **GIVEN** a layout with a `hot` zone
- **WHEN** the layout is viewed on the 2D canvas
- **THEN** the zone is drawn as a tinted rectangle with a colored dashed border and a
  "Hot" (or custom name) label, beneath the shelves

#### Scenario: Entry point marker shown

- **GIVEN** a layout with an entry point
- **WHEN** the layout is viewed on the 2D canvas
- **THEN** a door/arrow marker is drawn at the entry point position

### Requirement: Generate feedback reports aisles

After autogenerate, the editor toast SHALL report the number of aisles generated in
addition to shelves (and any skipped-outside count).

#### Scenario: Toast shows aisle and shelf counts

- **GIVEN** a successful autogenerate
- **WHEN** the result toast appears
- **THEN** it states both the shelf count and the aisle count
