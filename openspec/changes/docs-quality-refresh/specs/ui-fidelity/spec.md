# UI fidelity (consolidated)

> **Staged baseline** for change `docs-quality-refresh`. On apply, this augments `openspec/specs/ui-fidelity/spec.md` with the shipped layout-editor UI from LE/AG/ML.

## ADDED Requirements

### Requirement: Draw area and autogenerate controls

The Layout Editor SHALL provide a "Draw area" tool to define an irregular polygon and a "Generate" action to autogenerate aisles and shelves within it.

#### Scenario: Draw then generate

- **GIVEN** a Designer in the Layout Editor
- **WHEN** they draw a polygon with 3+ vertices, apply it, and open Generate
- **THEN** aisles and shelves are produced inside the drawn area

### Requirement: Per-level planogram panel

The planogram panel SHALL let the user choose a shelf level and show only products allowed by the shelf's category (and descendants); shelves without a category SHALL prompt to assign one.

#### Scenario: Level selector filters products

- **GIVEN** a shelf mapped to a category with children
- **WHEN** the planogram panel is open
- **THEN** a level selector is shown and the product list is filtered to that category tree

### Requirement: 2D wheel-zoom and immersive 3D

The editor SHALL support mouse-wheel zoom on the 2D canvas (bounded) and a 3D view with both Orbit (zoom/pan) and first-person Walk navigation showing shelf levels and product facings.

#### Scenario: Wheel zoom bounded

- **GIVEN** the 2D canvas
- **WHEN** the user scrolls the mouse wheel
- **THEN** the canvas zoom changes within min/max bounds without scrolling the page

#### Scenario: Walk mode

- **GIVEN** the 3D view in Walk mode
- **WHEN** the user uses WASD/mouse-look
- **THEN** the camera moves at eye height constrained to the floor area
