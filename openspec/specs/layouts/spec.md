# ShelfPilot — Layouts & Canvas

## Purpose

Manage store layout projects, dimensions, polygon floor areas, aisles, shelves, category mappings, rules-based autogeneration, and auto-calculation for the Layout Editor.

Consolidated from changes `layout-editor-planogram`, `layout-autogen-walkthrough`, `merch-layers-polygon-fix`, and `dual-face-numbered-shelves-strict-polygon`.

## Requirements

### Requirement: First-class shelves and aisles

The system SHALL model shelves and aisles as distinct first-class entities (not generic fixtures), each with position, dimensions, and (for shelves) levels and planogram, and SHALL expose a scaled canvas model.

#### Scenario: Create layout draft

- **GIVEN** an authenticated Designer
- **WHEN** they POST a layout with width, depth, and optional height
- **THEN** a draft layout is created with empty shelves and aisles
- **AND** autoCalc.maxFixtures is computed

### Requirement: Delete shelves and aisles

The system SHALL allow Designer/Admin to delete an individual shelf or aisle via
`DELETE /layouts/{layoutId}/shelves/{shelfId}` and `DELETE /layouts/{layoutId}/aisles/{aisleId}`,
returning the updated layout. Deleting an aisle SHALL remove its aisle mappings and detach any
shelf that referenced it; deleting a shelf SHALL remove its shelf mappings. Unknown ids SHALL
return 404 and Viewers SHALL be rejected. In the editor, selecting a shelf or aisle SHALL offer a
delete action (button and Delete/Backspace key) with a confirmation.

#### Scenario: Delete a shelf

- **GIVEN** a layout with a shelf that has a category mapping
- **WHEN** a Designer deletes that shelf
- **THEN** the shelf and its shelf mapping are removed and the updated layout is returned

#### Scenario: Delete an aisle detaches shelves

- **GIVEN** a shelf whose `aisleId` references an existing aisle
- **WHEN** that aisle is deleted
- **THEN** the aisle and its aisle mappings are removed and the shelf's `aisleId` is cleared

#### Scenario: Delete unknown shelf

- **GIVEN** a shelfId that does not exist
- **WHEN** a DELETE is sent
- **THEN** the API returns 404 with error `shelf_not_found`

### Requirement: Aisle minimum-width validation

The system SHALL flag aisles whose width is below the configured minimum.

#### Scenario: Narrow aisle flagged

- **GIVEN** a layout with minAisleWidthMeters = 1.2
- **WHEN** an aisle of width 0.8 is added
- **THEN** validation reports a min-width violation for that aisle

### Requirement: Category mapping with color

The system SHALL allow assigning a category to a shelf/aisle/zone with a display color.

#### Scenario: Map category

- **GIVEN** a shelf and a category
- **WHEN** a mapping is created with color `#A30A2A`
- **THEN** GET layout returns the mapping on that shelf

### Requirement: Polygon floor area with strict containment

The system SHALL allow defining an irregular polygon floor area, and SHALL reject placing or moving a shelf/aisle whose footprint is not fully inside the polygon, returning `containment_violation` (400).

#### Scenario: Move shelf outside polygon rejected

- **GIVEN** a layout with a polygon floor area and a contained shelf
- **WHEN** the shelf is PATCHed to a position outside the polygon
- **THEN** the API returns 400 with error `containment_violation`

#### Scenario: Validation reports containment violations

- **GIVEN** a layout with a polygon and entities
- **WHEN** validation runs
- **THEN** `validation.containmentViolations` lists any entity outside the polygon

### Requirement: Rules-based autogenerate

The system SHALL autogenerate aisles and shelves that fit strictly within the polygon using a deterministic packer honoring minimum aisle width, and SHALL be gated by the `autogenerate` feature flag (403 when disabled).

#### Scenario: Autogenerate stays inside polygon

- **GIVEN** a layout with a polygon floor area
- **WHEN** autogenerate runs
- **THEN** every generated shelf and aisle is fully inside the polygon
- **AND** `validation.containmentViolations` is empty

#### Scenario: Autogenerate disabled

- **GIVEN** the autogenerate flag is off
- **WHEN** a Designer calls autogenerate
- **THEN** the API returns 403

### Requirement: Layouts portfolio module

The Layouts module SHALL show the layout portfolio (status filters, project cards) and a **+ New layout** action — content previously on Dashboard.

#### Scenario: Portfolio landing

- **GIVEN** an authenticated Designer
- **WHEN** they open Layouts
- **THEN** they see the layout card grid and can filter by status

### Requirement: Single-form layout create

Creating a layout SHALL use one form (not multi-step wizard) collecting name, **store type**, dimensions, and initial floor shape.

#### Scenario: Create hypermarket layout

- **GIVEN** the create form
- **WHEN** the user selects store type Hypermarket and submits
- **THEN** a draft layout is created with vertical/config for hypermarket and the canvas editor opens

### Requirement: Smart category autogenerate

Autogenerate SHALL accept min aisle width and a **category mix** (percentages summing to 100%) and SHALL produce shelves pre-mapped to categories including chilled/frozen zones where configured.

#### Scenario: 50% produce mix

- **GIVEN** a polygon layout and category mix Fresh produce 50%, Grocery 50%
- **WHEN** smart autogenerate runs
- **THEN** approximately half of generated shelves are mapped to Fresh produce and half to Grocery
- **AND** containment violations remain zero

#### Scenario: Chilled zone shelves

- **GIVEN** a mix including Chilled 20%
- **WHEN** smart autogenerate runs
- **THEN** ~20% of shelves have `temperatureZone: chilled` and a chilled category mapping

### Requirement: Display numbers on shelves

Each shelf SHALL have a `displayNumber` assigned at autogenerate or manual add; numbers map to categories via legend.

#### Scenario: Autogenerate assigns sequential numbers

- **GIVEN** a polygon layout with room for 8 shelves
- **WHEN** smart autogenerate runs
- **THEN** each generated shelf has a unique `displayNumber` from 1 to 8 in pack order

### Requirement: Dual-sided shelf faces

Gondola-type shelves SHALL default to `doubleSided: true` with faces `A` and `B`. Hypermarket autogenerate uses gondola by default.

#### Scenario: Category mix on dual faces

- **GIVEN** category mix with multiple categories
- **WHEN** smart autogenerate runs on gondolas
- **THEN** Face A and Face B may receive different categories

### Requirement: Drawn polygon is exclusive fixture zone

Autogenerate SHALL omit shelves/aisles that do not fully fit inside the polygon and report `skippedOutsideCount`.

#### Scenario: Skipped count reported

- **GIVEN** a tight L-shaped polygon
- **WHEN** autogenerate cannot place all grid slots
- **THEN** the response includes `skippedOutsideCount` ≥ 0 and zero containment violations
