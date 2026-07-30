## ADDED Requirements

### Requirement: Portfolio status pipeline

The Dashboard SHALL display a **status pipeline** showing counts of layouts in each review state: Draft, In review, Approved, and Rejected. Each segment SHALL link to the Layouts module filtered by that status.

#### Scenario: Pipeline shows counts

- **GIVEN** a portfolio with 3 draft, 2 in review, 5 approved, and 1 rejected layout
- **WHEN** a user opens the Dashboard
- **THEN** the pipeline displays those counts
- **AND** clicking "In review" navigates to filtered layouts

### Requirement: Featured layout on Dashboard

The Dashboard SHALL highlight a **featured layout** (most recently updated by default) with store name, status, store type, key metrics, and a visual preview thumbnail or mini floor plan.

#### Scenario: Featured layout card

- **GIVEN** at least one layout in the portfolio
- **WHEN** the user opens the Dashboard
- **THEN** a featured layout card shows name, status badge, and Open editor action

### Requirement: Dashboard quick actions

The Dashboard SHALL provide quick actions including **New layout**, **Open last edited**, and (for approvers) **Pending approvals**, without requiring navigation through the Layouts module first.

#### Scenario: New layout from Dashboard

- **GIVEN** a designer on the Dashboard
- **WHEN** they click New layout
- **THEN** the single create layout form opens

## MODIFIED Requirements

### Requirement: Dashboard analytics home

The Dashboard SHALL present portfolio-level summary suitable for stakeholder demos: status pipeline, featured layout, compact KPI strip, one combined space/category visualization, and recent layouts list. Per-layout deep analytics MAY be accessed by selecting a layout but SHALL NOT be the only content above the fold.

#### Scenario: Stakeholder grasps portfolio in 30 seconds

- **GIVEN** a portfolio with mixed layout statuses
- **WHEN** a stakeholder opens the Dashboard
- **THEN** they see layout counts by status, a featured layout, and recent activity without scrolling past primary fold on 1366×768
