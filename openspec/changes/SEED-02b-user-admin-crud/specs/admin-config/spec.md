# admin-config — delta for SEED-02b-user-admin-crud

## Purpose

Delta requirements for **SEED-02b-user-admin-crud**. Parent capability live specs: `openspec/specs/admin-config/spec.md` (if present).

## Requirements

### Requirement: SEED-02b-user-admin-crud delivery

The system SHALL satisfy the goal: Admin can create/update demo users in SQLite (mock passwords).

#### Scenario: AC-1
- **GIVEN** Admin
- **WHEN** creating a user with role Designer
- **THEN** user appears in GET /admin/users.

#### Scenario: AC-2
- **GIVEN** the new user credentials
- **WHEN** login
- **THEN** token issued.

#### Scenario: AC-3
- **GIVEN** Designer
- **WHEN** POST /admin/users
- **THEN** 403.

