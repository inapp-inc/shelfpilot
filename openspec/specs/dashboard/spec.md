# dashboard

> Baseline module — added by change `module-reframe-smart-autogen`.

## Purpose

Analytics-style home: portfolio KPIs and category summary — **not** the layout portfolio grid.

## Requirements

### Requirement: Dashboard KPI summary

The Dashboard SHALL show utilization, layout count, shelf count, and mapped category count for the portfolio.

#### Scenario: Designer opens app

- **GIVEN** an authenticated Designer with existing layouts
- **WHEN** they open Dashboard
- **THEN** KPI cards and a category allocation summary are visible
- **AND** a primary layout portfolio grid is not shown

### Requirement: Recent layouts shortcut

The Dashboard SHALL list recent layouts with links that open the layout in the Layouts module canvas view.

#### Scenario: Open layout from recent strip

- **GIVEN** a recent layout card on Dashboard
- **WHEN** the user clicks it
- **THEN** the Layouts module opens that layout in the canvas editor
