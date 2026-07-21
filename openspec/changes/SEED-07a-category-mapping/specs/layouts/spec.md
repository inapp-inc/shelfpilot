# layouts — delta for SEED-07a-category-mapping

## Purpose

Delta requirements for **SEED-07a-category-mapping**. Parent capability live specs: `openspec/specs/layouts/spec.md` (if present).

## Requirements

### Requirement: SEED-07a-category-mapping delivery

The system SHALL satisfy the goal: Map product category to fixture/shelf with color coding (space planogram foundation).

#### Scenario: AC-1
- **GIVEN** fixture and category
- **WHEN** POST mapping with color
- **THEN** GET layout returns mapping and fixture.color.

#### Scenario: AC-2
- **GIVEN** Viewer
- **WHEN** POST mapping
- **THEN** 403.

#### Scenario: AC-3
- **GIVEN** mapped fixtures
- **WHEN** viewing 2D canvas
- **THEN** colors match legend.

