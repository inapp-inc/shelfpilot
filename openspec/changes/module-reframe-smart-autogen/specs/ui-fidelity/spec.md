# ui-fidelity (delta)

> Staged for change `module-reframe-smart-autogen`.

## ADDED Requirements

### Requirement: Emoji module navigation

The app shell SHALL show sidebar navigation with emoji and label for Dashboard, Layouts, Products, Analytics, and Admin.

#### Scenario: Nav labels

- **GIVEN** an authenticated user
- **WHEN** the shell renders
- **THEN** each module shows an emoji prefix and readable label

### Requirement: Single-form create drawer

New layout creation SHALL use a slide-over or panel form with all fields on one screen (no step indicator).

### Requirement: Category mix slider UI

Smart generate SHALL present category mix as sliders with live total percentage and visual distinction for chilled/frozen zones.

#### Scenario: Mix total validation

- **GIVEN** category mix sliders
- **WHEN** the total is not 100%
- **THEN** the UI indicates invalid state and blocks generate (or auto-normalizes per product decision)

### Requirement: Chilled shelf styling

Shelves with `temperatureZone: chilled` or `frozen` SHALL be visually distinct on the 2D canvas (e.g. cool-toned border/fill).
