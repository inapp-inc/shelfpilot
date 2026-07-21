# ShelfPilot — Analytics

## Purpose

Provide utilization, capacity, category allocation, and version comparison reports (M5).

## Requirements

### Requirement: Layout analytics summary

The system SHALL compute space utilization and category allocation from layout geometry and mappings.

#### Scenario: Summary for layout

- **GIVEN** a layout with fixtures and mappings
- **WHEN** analytics summary is requested
- **THEN** utilizationPercent, capacity, and allocationByCategory are returned

### Requirement: Version comparison

The system SHALL compare two layout versions’ utilization metrics.

#### Scenario: Compare versions

- **GIVEN** two layout version ids
- **WHEN** compare is requested
- **THEN** deltas for utilization and fixture counts are returned
