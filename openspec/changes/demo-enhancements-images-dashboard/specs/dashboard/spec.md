## ADDED Requirements

### Requirement: Per-layout dashboard with charts

The dashboard SHALL let the user select a layout and view its metrics as charts: free space
vs used floor area, category fill (share per category), and facings by category, plus KPI
cards (utilization, shelves, aisles, mapped categories). Charts SHALL be rendered without a
heavy third-party charting dependency. An empty or unfilled layout SHALL render a clear
empty state.

#### Scenario: Drill into a layout

- **GIVEN** layouts exist
- **WHEN** the user selects a layout on the dashboard
- **THEN** the dashboard shows that layout's free-space, category-fill, and facings charts and KPIs

#### Scenario: Empty layout

- **GIVEN** a layout with no shelves or mappings
- **WHEN** it is selected on the dashboard
- **THEN** a friendly empty state is shown instead of empty charts

### Requirement: Free space and facings analytics

`GET /analytics/layouts/{layoutId}/summary` SHALL include `freeSpacePercent`,
`facingsTotal`, and `facingsByCategory` in addition to the existing utilization and category
allocation, computed from the layout's fixtures and planogram placements.

#### Scenario: Free space reflects fixtures

- **GIVEN** a layout with fixtures covering part of the usable area
- **WHEN** its summary is requested
- **THEN** `freeSpacePercent` equals 100 minus the used-area percentage (clamped to 0–100)

#### Scenario: Facings grouped by category

- **GIVEN** shelves with planogram placements mapped to categories
- **WHEN** the summary is requested
- **THEN** `facingsByCategory` totals the facings per category and `facingsTotal` is their sum
