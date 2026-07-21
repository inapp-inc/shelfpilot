# platform — delta for SEED-00c-openapi-align

## Purpose

Delta requirements for **SEED-00c-openapi-align**. Parent capability live specs: `openspec/specs/platform/spec.md` (if present).

## Requirements

### Requirement: SEED-00c-openapi-align delivery

The system SHALL satisfy the goal: Align Docs/openapi.yaml with every live API route and schema used by the UI.

#### Scenario: AC-1
- **GIVEN** codebase/api routes
- **WHEN** comparing to Docs/openapi.yaml
- **THEN** every path+method is documented.

#### Scenario: AC-2
- **GIVEN** npm run openapi:check
- **WHEN** executed
- **THEN** exit code 0.

