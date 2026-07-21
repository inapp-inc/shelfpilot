# ShelfPilot — Admin & Configuration

## Purpose

Administer users/roles, store master, approval workflow, vertical configuration, and audit log (M6).

## Requirements

### Requirement: Vertical configuration

The system SHALL expose global and vertical-specific configuration (units, fixture templates, min aisle width, compliance rules) without code changes per vertical.

#### Scenario: Switch vertical templates

- **GIVEN** configs for `pharmacy` and `apparel`
- **WHEN** active vertical is set to `pharmacy`
- **THEN** fixture templates and min aisle rules for pharmacy are returned

### Requirement: Audit log

The system SHALL record significant admin and layout mutation events.

#### Scenario: Config change audited

- **GIVEN** an Admin updates vertical config
- **WHEN** audit log is listed
- **THEN** an event describing the change is present

### Requirement: Approval workflow

The system SHALL support layout status transitions draft → in_review → approved (and rejected).

#### Scenario: Submit for review

- **GIVEN** a Designer draft layout
- **WHEN** status is set to in_review
- **THEN** Approver can set approved or rejected
