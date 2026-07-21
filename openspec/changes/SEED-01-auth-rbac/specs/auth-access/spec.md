# auth-access — delta for SEED-01-auth-rbac

## Purpose

Delta requirements for **SEED-01-auth-rbac**. Parent capability live specs: `openspec/specs/auth-access/spec.md` (if present).

## Requirements

### Requirement: SEED-01-auth-rbac delivery

The system SHALL satisfy the goal: Mock email/password login with role selection and bearer-token RBAC.

#### Scenario: AC-1
- **GIVEN** valid email/password/role
- **WHEN** login
- **THEN** token and user are returned.

#### Scenario: AC-2
- **GIVEN** Viewer token
- **WHEN** POST /layouts
- **THEN** 403.

