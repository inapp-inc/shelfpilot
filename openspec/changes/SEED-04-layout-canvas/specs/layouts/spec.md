# layouts — delta for SEED-04-layout-canvas

## Purpose

Delta requirements for **SEED-04-layout-canvas**. Parent capability live specs: `openspec/specs/layouts/spec.md` (if present).

## Requirements

### Requirement: SEED-04-layout-canvas delivery

The system SHALL satisfy the goal: M1 layout canvas: scaled floor, zoom, selection, aisle tools with min-width validation.

#### Scenario: AC-1
- **GIVEN** dimensions entered
- **WHEN** layout opens
- **THEN** scaled blank canvas is visible immediately.

#### Scenario: AC-2
- **GIVEN** min aisle from vertical config
- **WHEN** aisle width is below min
- **THEN** violation shows icon and text.

#### Scenario: AC-3
- **GIVEN** zoom controls
- **WHEN** zoom in/out
- **THEN** canvas scale updates.

