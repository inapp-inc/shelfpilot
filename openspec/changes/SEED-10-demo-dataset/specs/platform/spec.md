# platform — delta for SEED-10-demo-dataset

## Purpose

Delta requirements for **SEED-10-demo-dataset**. Parent capability live specs: `openspec/specs/platform/spec.md` (if present).

## Requirements

### Requirement: SEED-10-demo-dataset delivery

The system SHALL satisfy the goal: One-command demo dataset: 3 projects with fixtures, aisles, mappings.

#### Scenario: AC-1
- **GIVEN** empty or reset DB
- **WHEN** npm run seed:demo
- **THEN** dashboard shows 3 layout cards.

#### Scenario: AC-2
- **GIVEN** pharmacy demo layout
- **WHEN** opened
- **THEN** fixtures and at least one mapping exist.

