# analytics — delta for SEED-08b-version-compare

## Purpose

Delta requirements for **SEED-08b-version-compare**. Parent capability live specs: `openspec/specs/analytics/spec.md` (if present).

## Requirements

### Requirement: SEED-08b-version-compare delivery

The system SHALL satisfy the goal: Compare two layouts (or versions) for utilization and fixture count deltas.

#### Scenario: AC-1
- **GIVEN** two layout ids
- **WHEN** POST compare
- **THEN** utilizationDelta and fixtureCountDelta are returned.

#### Scenario: AC-2
- **GIVEN** Analytics UI
- **WHEN** selecting A and B
- **THEN** deltas display.

