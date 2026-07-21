# platform — delta for SEED-00b-sqlite-docker

## Purpose

Delta requirements for **SEED-00b-sqlite-docker**. Parent capability live specs: `openspec/specs/platform/spec.md` (if present).

## Requirements

### Requirement: SEED-00b-sqlite-docker delivery

The system SHALL satisfy the goal: Replace in-memory store with SQLite and ship local Docker Compose (api + web + volume).

#### Scenario: AC-1
- **GIVEN** a created layout
- **WHEN** API restarts with same SQLITE_PATH
- **THEN** GET layout returns the same fixtures.

#### Scenario: AC-2
- **GIVEN** docker compose up --build
- **WHEN** GET /health on api
- **THEN** ok true.

#### Scenario: AC-3
- **GIVEN** npm test
- **WHEN** run on Node >= 22.5
- **THEN** all API tests pass.

