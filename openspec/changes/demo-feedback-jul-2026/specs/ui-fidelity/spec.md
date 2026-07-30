## ADDED Requirements

### Requirement: WebGL 2D floor plan renderer

The layout editor 2D view SHALL support a **WebGL** renderer (Three.js orthographic top-down) that draws the store envelope, fixture polygon, aisles, shelves, zones, and labels in metre-scaled space with consistent alignment at all supported zoom levels.

#### Scenario: WebGL 2D enabled

- **GIVEN** feature flag `VITE_USE_WEBGL_2D` is true
- **WHEN** the designer opens the layout editor in 2D mode
- **THEN** fixtures render in WebGL
- **AND** select, drag, and rotate interactions work equivalently to the legacy canvas

#### Scenario: Shelf aligns with aisle at zoom

- **GIVEN** a generated runway layout at 200% zoom
- **WHEN** the designer views the floor plan
- **THEN** shelf edges align with adjacent aisle centrelines without visible offset

### Requirement: Shelf hover product preview

When the designer hovers a shelf face on the 2D floor plan, the system SHALL show a tooltip with the face label, assigned category, and a list of products on that face (up to eight items, with overflow count).

#### Scenario: Hover shows products

- **GIVEN** shelf face **4A** with three products in its planogram
- **WHEN** the designer hovers that face for 500 ms
- **THEN** a tooltip lists the three product names or SKUs

#### Scenario: Empty face hover

- **GIVEN** shelf face **4B** with no products assigned
- **WHEN** the designer hovers that face
- **THEN** the tooltip indicates no products are assigned

## MODIFIED Requirements

### Requirement: Shelf identity in Properties panel

When a shelf is selected, the Properties panel SHALL show the **aisle-centric label** (e.g. **4A**), editable name/label, fixture type, and dimensions summary. The label SHALL match the canvas badge and Merchandising header.

#### Scenario: Properties shows aisle-centric label

- **GIVEN** shelf **4B** selected on canvas
- **WHEN** the designer opens Properties
- **THEN** the panel displays **4B** as the shelf identifier
