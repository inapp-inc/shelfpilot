## ADDED Requirements

### Requirement: Responsive shelf number badges

Shelf display numbers on the 2D canvas SHALL remain readable on small fixtures. For
dual-sided shelves, Face A and Face B identifiers SHALL remain distinguishable via
layout adaptation (split, stacked, or compact badge) and tooltips when space is limited.

#### Scenario: Narrow shelf badge

- **GIVEN** a shelf rendered narrower than 36 px on screen
- **WHEN** the layout is viewed at default zoom
- **THEN** the shelf shows at minimum a display number with a tooltip listing face/category detail

#### Scenario: Dual-face medium shelf

- **GIVEN** a double-sided shelf rendered between 36 px and 55 px wide
- **WHEN** the layout is viewed on the canvas
- **THEN** Face A and Face B labels are stacked or otherwise non-overlapping

### Requirement: Segment dividers on canvas

When a shelf with multiple segments is selected, the 2D canvas SHALL show divider lines
at segment boundaries aligned with the shelf rotation.

#### Scenario: Selected split shelf shows bays

- **GIVEN** a shelf with three segments
- **WHEN** the Designer selects that shelf
- **THEN** two divider lines separate the three bays on the fixture

## MODIFIED Requirements

### Requirement: Canvas fixture labelling

The 2D canvas SHALL identify shelves by **display number** (and face suffix for
dual-sided units), not by fixture type name. Dimension overlays and segment dividers
SHALL NOT obscure the display number; badges SHALL scale down before clipping.

#### Scenario: Number visible with dimensions

- **GIVEN** a selected shelf showing a dimension chip
- **WHEN** viewed at 100% zoom
- **THEN** the display number remains readable alongside the dimension label
