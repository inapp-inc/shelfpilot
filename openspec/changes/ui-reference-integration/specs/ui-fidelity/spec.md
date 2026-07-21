# UI fidelity — ShelfPilot

## Purpose

Ensure the executable web app matches the approved visual prototype in `ui/ShelfPilot.dc.html`.

## Requirements

### Requirement: Visual source of truth

The web application SHALL match the structure, brand tokens, and primary layouts of `ui/ShelfPilot.dc.html` for Login, Shell, Dashboard, Layout Editor, Products & Categories, Analytics, and Admin & Config.

#### Scenario: Login brand block

- **GIVEN** an unauthenticated user
- **WHEN** the login screen renders
- **THEN** the crimson rounded logo with shelf bars, ShelfPilot wordmark at hero size, and “Built by the Foundry” footer are present

#### Scenario: Editor three-column layout

- **GIVEN** an open layout
- **WHEN** the Layout Editor is shown in 2D mode
- **THEN** fixture palette (left), canvas (center), and properties + category legend (right) are visible
- **AND** aisle violations show icon + text alert
