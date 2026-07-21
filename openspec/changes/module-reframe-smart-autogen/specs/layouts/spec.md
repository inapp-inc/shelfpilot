# layouts (delta)

> Staged for change `module-reframe-smart-autogen`.

## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: Rules-based autogenerate

The system SHALL autogenerate aisles and shelves that fit strictly within the polygon using a deterministic packer honoring minimum aisle width, optionally applying category mix from the request body, and SHALL be gated by the autogenerate feature flag.
