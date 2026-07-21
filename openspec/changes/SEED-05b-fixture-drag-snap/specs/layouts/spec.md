# layouts — delta for SEED-05b-fixture-drag-snap

## Purpose

Delta requirements for **SEED-05b-fixture-drag-snap**. Parent capability live specs: `openspec/specs/layouts/spec.md` (if present).

## Requirements

### Requirement: SEED-05b-fixture-drag-snap delivery

The system SHALL satisfy the goal: 2D click-to-place, drag move, and snap-to-grid with persisted positions.

#### Scenario: AC-1
- **GIVEN** Designer
- **WHEN** dragging a fixture and releasing
- **THEN** saved x/y match snapped grid.

#### Scenario: AC-2
- **GIVEN** reload layout
- **WHEN** editor opens
- **THEN** fixture is at saved position.

