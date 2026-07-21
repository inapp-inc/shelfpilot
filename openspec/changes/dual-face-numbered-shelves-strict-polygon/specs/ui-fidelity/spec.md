## ADDED Requirements

### Requirement: Strict polygon canvas viewport

When a layout has a polygon floor area, the 2D canvas SHALL size and clip to the polygon's axis-aligned bounding box (not the full layout rectangle). Area outside the polygon within the layout bounds SHALL be visually de-emphasized and non-interactive for fixture placement.

#### Scenario: Canvas matches drawn area

- **GIVEN** a layout rectangle 40×30 m with a drawn polygon covering 25×18 m
- **WHEN** the 2D editor renders
- **THEN** the active canvas stage matches the polygon AABB
- **AND** grid snapping applies only inside the polygon

#### Scenario: Draw tool constrained to fixture zone

- **GIVEN** Draw area mode with an existing polygon
- **WHEN** the user attempts to place a shelf via palette outside the polygon
- **THEN** the drop is rejected or snapped to the nearest valid position inside the polygon

### Requirement: Numbered shelf badges without type labels

The 2D canvas SHALL display shelf **display numbers** instead of fixture type text (`shelf`, `gondola`). Double-sided shelves SHALL show face suffixes (`12A`, `12B`) with category color fill. A **shelf number legend** SHALL map numbers (and face suffixes) to category names.

#### Scenario: Single-sided shelf badge

- **GIVEN** a shelf with `displayNumber: 5` mapped to Grocery
- **WHEN** the 2D canvas renders
- **THEN** the badge shows `5` with Grocery color
- **AND** no `shelf` type label is shown

#### Scenario: Dual-sided gondola badge

- **GIVEN** gondola `displayNumber: 12` with Face A Grocery and Face B Chilled
- **WHEN** the 2D canvas renders
- **THEN** the fixture shows `12A` and `12B` on opposite halves with respective colors

### Requirement: Merchandising face selector

The Merchandising tab SHALL provide **Face A | Face B** selection when the selected shelf is double-sided; planogram level selector and product list SHALL reflect the active face's category.

#### Scenario: Switch face updates product filter

- **GIVEN** a double-sided gondola with Face A = Beverages and Face B = Snacks
- **WHEN** the user selects Face B in Merchandising
- **THEN** the product picker lists Snacks subtree only

## MODIFIED Requirements

### Requirement: Draw area and autogenerate controls

The Layout Editor SHALL provide a "Draw area" tool to define the **fixture zone** polygon (aisles and shelves only inside it) and a "Generate" action that autogenerates within that zone, assigning display numbers and dual faces where applicable.

#### Scenario: Draw then generate with numbers

- **GIVEN** a Designer draws a polygon with 3+ vertices and applies it
- **WHEN** they run Smart Generate
- **THEN** aisles and shelves appear only inside the polygon
- **AND** each shelf shows a display number (not a type label)
