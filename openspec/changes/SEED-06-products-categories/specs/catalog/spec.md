# catalog — delta for SEED-06-products-categories

## Purpose

Delta requirements for **SEED-06-products-categories**. Parent capability live specs: `openspec/specs/catalog/spec.md` (if present).

## Requirements

### Requirement: SEED-06-products-categories delivery

The system SHALL satisfy the goal: M3 hierarchical categories and products per vertical with JSON import/export.

#### Scenario: AC-1
- **GIVEN** vertical pharmacy
- **WHEN** listing categories
- **THEN** tree includes parent/child where seeded.

#### Scenario: AC-2
- **GIVEN** import payload
- **WHEN** POST /catalog/import
- **THEN** counts > 0 and data listable.

#### Scenario: AC-3
- **GIVEN** export
- **WHEN** user clicks Export
- **THEN** JSON downloads.

