# layouts — delta for SEED-03-dashboard-projects

## Purpose

Delta requirements for **SEED-03-dashboard-projects**. Parent capability live specs: `openspec/specs/layouts/spec.md` (if present).

## Requirements

### Requirement: SEED-03-dashboard-projects delivery

The system SHALL satisfy the goal: Dashboard portfolio parity with UI SoT: filters, cards, empty state, wizard entry.

#### Scenario: AC-1
- **GIVEN** layouts with mixed statuses
- **WHEN** filtering draft
- **THEN** only drafts show.

#### Scenario: AC-2
- **GIVEN** Designer
- **WHEN** completing wizard with dimensions
- **THEN** draft layout is created and editor opens.

#### Scenario: AC-3
- **GIVEN** no matching filter
- **WHEN** dashboard loads
- **THEN** empty state is shown.

