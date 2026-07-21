# platform — delta for SEED-11-compose-demo-pack

## Purpose

Delta requirements for **SEED-11-compose-demo-pack**. Parent capability live specs: `openspec/specs/platform/spec.md` (if present).

## Requirements

### Requirement: SEED-11-compose-demo-pack delivery

The system SHALL satisfy the goal: Documented one-shot docker compose demo with smoke script (health + login).

#### Scenario: AC-1
- **GIVEN** clean machine with Docker
- **WHEN** following README compose steps
- **THEN** http://localhost:8080 loads.

#### Scenario: AC-2
- **GIVEN** smoke script
- **WHEN** run against compose stack
- **THEN** exit 0.

