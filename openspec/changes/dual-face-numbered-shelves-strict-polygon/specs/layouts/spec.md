## ADDED Requirements

### Requirement: Display numbers on shelves

Each shelf SHALL have a `displayNumber` (positive integer) assigned at autogenerate or on manual add. The number identifies the shelf in the layout and maps to category assignment(s) via legend.

#### Scenario: Autogenerate assigns sequential numbers

- **GIVEN** a polygon layout with room for 8 shelves
- **WHEN** smart autogenerate runs
- **THEN** each generated shelf has a unique `displayNumber` from 1 to 8 in pack order

#### Scenario: Manual shelf gets next number

- **GIVEN** a layout whose highest `displayNumber` is 12
- **WHEN** a Designer adds a shelf manually
- **THEN** the new shelf receives `displayNumber` 13

### Requirement: Dual-sided shelf faces

Gondola-type shelves SHALL default to `doubleSided: true` with two faces (`A`, `B`), each with optional `categoryId`, `color`, and `planogram[]`. Single-sided types (`shelf`, `rack`, `storage`) SHALL have one face only.

#### Scenario: Gondola autogen creates two faces

- **GIVEN** store type Hypermarket and autogenerate produces a gondola row
- **WHEN** the layout is returned
- **THEN** each gondola has `doubleSided: true` and `faces` with ids `A` and `B`

#### Scenario: Category mix on dual faces

- **GIVEN** category mix with paired slots for gondola rows
- **WHEN** smart autogenerate runs
- **THEN** Face A and Face B may receive different categories from the mix template

### Requirement: Drawn polygon is exclusive fixture zone

The user-drawn polygon SHALL define the **only** region where aisles and shelves may exist. Layout `widthMeters` × `depthMeters` remain metadata; autogenerate and manual placement SHALL treat the polygon as authoritative.

#### Scenario: No fixtures outside drawn line

- **GIVEN** an L-shaped polygon smaller than the layout rectangle
- **WHEN** autogenerate runs
- **THEN** no shelf or aisle footprint extends outside the polygon
- **AND** slots that do not fit are left empty (omitted)

#### Scenario: Skipped count reported

- **GIVEN** a tight polygon with limited space
- **WHEN** autogenerate cannot place all candidate shelves
- **THEN** the response includes `skippedOutsideCount` ≥ 0

## MODIFIED Requirements

### Requirement: Polygon floor area with strict containment

The system SHALL allow defining an irregular polygon floor area as the **fixture zone**, and SHALL reject placing or moving a shelf/aisle whose footprint is not fully inside the polygon, returning `containment_violation` (400). Autogenerate SHALL omit entities that do not fully fit rather than clip partially outside.

#### Scenario: Partial slot omitted not clipped outside

- **GIVEN** a polygon where only 3 of 4 grid slots fit a shelf footprint
- **WHEN** autogenerate runs
- **THEN** at most 3 shelves are placed in that row
- **AND** the 4th slot is blank
