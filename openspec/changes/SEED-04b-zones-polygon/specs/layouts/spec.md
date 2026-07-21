# layouts — delta for SEED-04b-zones-polygon

## Purpose

Delta requirements for **SEED-04b-zones-polygon**. Parent capability live specs: `openspec/specs/layouts/spec.md` (if present).

## Requirements

### Requirement: SEED-04b-zones-polygon delivery

The system SHALL satisfy the goal: Demo-level store zones and irregular polygon boundary storage/render.

#### Scenario: AC-1
- **GIVEN** shape polygon
- **WHEN** saving boundary points
- **THEN** GET layout returns polygon array.

#### Scenario: AC-2
- **GIVEN** polygon layout
- **WHEN** opening 2D editor
- **THEN** outline is rendered.

