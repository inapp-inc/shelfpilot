# UI fidelity

## Purpose

Ensure the executable web app matches the approved visual prototype in `ui/ShelfPilot.dc.html`, including the modular layout editor with polygon draw, autogenerate, planogram, and immersive 3D.

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

### Requirement: Catalog master-detail layout

The Products & Categories page SHALL use a category tree sidebar that filters the product table, with Add category and Add product actions opening slide-over drawers.

#### Scenario: Filter products by category

- **GIVEN** a category selected in the tree
- **WHEN** the product table renders
- **THEN** only products in that category (and descendants) are listed

### Requirement: Editor merchandising tab

The Layout Editor right rail SHALL use tabs separating Properties from a guided Merchandising flow (category assignment then per-level planogram).

#### Scenario: Guided shelf merchandising

- **GIVEN** a selected shelf in the editor
- **WHEN** the Merchandising tab is active
- **THEN** the user assigns a category then places products by level without scrolling past unrelated panels

### Requirement: Quick-add product from planogram

When no products match a shelf's category tree, the Merchandising panel SHALL offer a quick-add product action pre-filled with that category.

#### Scenario: Empty category product list

- **GIVEN** a shelf mapped to Seasonal with zero products
- **WHEN** the planogram step renders
- **THEN** a call-to-action opens the product drawer with category pre-selected

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
- **THEN** the UI blocks generate until total equals 100% (sliders auto-rebalance on change)

### Requirement: Chilled shelf styling

Shelves with `temperatureZone: chilled` or `frozen` SHALL be visually distinct on the 2D canvas (cool-toned border/fill).

### Requirement: Strict polygon canvas viewport

When a layout has a polygon floor area, the 2D canvas SHALL size to the polygon AABB (not the full layout rectangle). Placement outside the polygon SHALL be rejected.

#### Scenario: Canvas matches drawn area

- **GIVEN** a layout rectangle larger than the drawn polygon
- **WHEN** the 2D editor renders
- **THEN** the active canvas stage matches the polygon AABB

### Requirement: Numbered shelf badges without type labels

The 2D canvas SHALL display shelf **display numbers** (`12`, `12A`, `12B`) instead of fixture type text. A shelf number legend maps numbers to categories.

#### Scenario: Dual-sided gondola badge

- **GIVEN** gondola `displayNumber: 12` with Face A Grocery and Face B Chilled
- **WHEN** the 2D canvas renders
- **THEN** the fixture shows `12A` and `12B` with respective colors

### Requirement: Merchandising face selector

The Merchandising tab SHALL provide **Face A | Face B** selection when the selected shelf is double-sided.

#### Scenario: Switch face updates product filter

- **GIVEN** a double-sided gondola with Face B = Snacks
- **WHEN** the user selects Face B in Merchandising
- **THEN** the product picker lists Snacks subtree only
