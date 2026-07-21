# analytics — delta for SEED-08-analytics

## Purpose

Delta requirements for **SEED-08-analytics**. Parent capability live specs: `openspec/specs/analytics/spec.md` (if present).

## Requirements

### Requirement: SEED-08-analytics delivery

The system SHALL satisfy the goal: M5 analytics summary: utilization, capacity, allocation-by-category, layout picker.

#### Scenario: AC-1
- **GIVEN** mapped layout
- **WHEN** GET summary
- **THEN** utilizationPercent and fixtureCount are consistent with geometry.

#### Scenario: AC-2
- **GIVEN** no mappings
- **WHEN** GET summary
- **THEN** allocationByCategory is empty array.

