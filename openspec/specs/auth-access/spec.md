# ShelfPilot — Auth & Access

## Purpose

Provide mock authentication and role-based access for Designer, Approver, Viewer, and Admin users during the UI + mock API phase.

## Requirements

### Requirement: Mock sign-in with role selection

The system SHALL allow a user to sign in with email and password and select a role of Designer, Approver, Viewer, or Admin.

#### Scenario: Successful login

- **GIVEN** valid demo credentials
- **WHEN** the user submits email, password, and role
- **THEN** the API returns a session token and the user’s role
- **AND** subsequent API calls with that token succeed

#### Scenario: Unauthorized without token

- **GIVEN** no Authorization header
- **WHEN** a protected endpoint is called
- **THEN** the API responds with 401

### Requirement: Role-gated navigation

The system SHALL restrict Admin configuration screens to Admin role and restrict layout mutation to Designer (and Approver for approval actions).

#### Scenario: Viewer cannot mutate layout

- **GIVEN** a Viewer session
- **WHEN** a layout update is attempted
- **THEN** the API responds with 403
