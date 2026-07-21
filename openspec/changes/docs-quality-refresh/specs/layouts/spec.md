# ShelfPilot — Layouts & Canvas (consolidated)

> **Staged baseline** for change `docs-quality-refresh`. On apply, this replaces `openspec/specs/layouts/spec.md`, folding in `layout-editor-planogram`, `layout-autogen-walkthrough`, and `merch-layers-polygon-fix`.

## MODIFIED Requirements

### Requirement: First-class shelves and aisles

The system SHALL model shelves and aisles as distinct first-class entities (not generic fixtures), each with position, dimensions, and (for shelves) levels and planogram, and SHALL expose a scaled canvas model.

#### Scenario: Create layout draft

- **GIVEN** an authenticated Designer
- **WHEN** they POST a layout with width, depth, and optional height
- **THEN** a draft layout is created with empty shelves and aisles
- **AND** autoCalc.maxFixtures is computed

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

## ADDED Requirements

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
