# auth-access — delta for SEED-01b-auth-session-hardening

## Purpose

Delta requirements for **SEED-01b-auth-session-hardening**. Parent capability live specs: `openspec/specs/auth-access/spec.md` (if present).

## Requirements

### Requirement: SEED-01b-auth-session-hardening delivery

The system SHALL satisfy the goal: Demo-safe session lifecycle on SQLite (expiry + logout).

#### Scenario: AC-1
- **GIVEN** an expired token
- **WHEN** calling a protected endpoint
- **THEN** 401.

#### Scenario: AC-2
- **GIVEN** logout
- **WHEN** the same token is reused
- **THEN** 401.

#### Scenario: AC-3
- **GIVEN** AUTH_SESSION_TTL unset or 0
- **WHEN** login
- **THEN** long-lived demo session still works.

