# catalog — delta for SEED-06b-catalog-seed-verticals

## Purpose

Delta requirements for **SEED-06b-catalog-seed-verticals**. Parent capability live specs: `openspec/specs/catalog/spec.md` (if present).

## Requirements

### Requirement: SEED-06b-catalog-seed-verticals delivery

The system SHALL satisfy the goal: Rich demo catalog seed for Retail, Pharmacy, Beauty, Apparel from UI SoT data.

#### Scenario: AC-1
- **GIVEN** fresh or seeded DB
- **WHEN** switching each vertical
- **THEN** category tree is non-empty.

#### Scenario: AC-2
- **GIVEN** each vertical
- **WHEN** listing products
- **THEN** at least 3 products exist.

