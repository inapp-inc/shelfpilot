# layouts — delta for SEED-05-fixtures-autocalc

## Purpose

Delta requirements for **SEED-05-fixtures-autocalc**. Parent capability live specs: `openspec/specs/layouts/spec.md` (if present).

## Requirements

### Requirement: SEED-05-fixtures-autocalc delivery

The system SHALL satisfy the goal: M2 fixture palette from vertical templates, place/edit/delete, auto-calc on dimension change.

#### Scenario: AC-1
- **GIVEN** Designer
- **WHEN** placing a shelf from palette
- **THEN** fixture appears on GET layout.

#### Scenario: AC-2
- **GIVEN** layout dimensions patched larger
- **WHEN** auto-calc runs
- **THEN** maxFixtures increases.

#### Scenario: AC-3
- **GIVEN** Viewer
- **WHEN** POST fixture
- **THEN** 403.

