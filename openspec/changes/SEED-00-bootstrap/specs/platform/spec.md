# platform — delta for SEED-00-bootstrap

## Purpose

Delta requirements for **SEED-00-bootstrap**. Parent capability live specs: `openspec/specs/platform/spec.md` (if present).

## Requirements

### Requirement: SEED-00-bootstrap delivery

The system SHALL satisfy the goal: Scaffold ShelfPilot codebase with health API and project layout.

#### Scenario: AC-1
- **GIVEN** the API is running
- **WHEN** GET /health
- **THEN** response is 200 with ok true and correlationId.

#### Scenario: AC-2
- **GIVEN** the repo
- **WHEN** inspecting Docs/
- **THEN** openapi.yaml exists.

