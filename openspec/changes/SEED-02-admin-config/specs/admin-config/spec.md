# admin-config — delta for SEED-02-admin-config

## Purpose

Delta requirements for **SEED-02-admin-config**. Parent capability live specs: `openspec/specs/admin-config/spec.md` (if present).

## Requirements

### Requirement: SEED-02-admin-config delivery

The system SHALL satisfy the goal: Full Admin & Config (M6) wired to SQLite: users tab, store master, approval, configuration, audit.

#### Scenario: AC-1
- **GIVEN** Admin
- **WHEN** PUT config for pharmacy
- **THEN** GET returns pharmacy rules.

#### Scenario: AC-2
- **GIVEN** Designer
- **WHEN** PUT config
- **THEN** 403.

#### Scenario: AC-3
- **GIVEN** pharmacy vs apparel
- **WHEN** GET config
- **THEN** minAisleWidthMeters differs.

#### Scenario: AC-4
- **GIVEN** approvalWorkflowEnabled true
- **WHEN** Viewer tries approve
- **THEN** 403; Approver can approve.

