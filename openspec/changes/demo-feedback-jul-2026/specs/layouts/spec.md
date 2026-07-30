## ADDED Requirements

### Requirement: Aisle number on walk aisles

Each walk aisle on a layout SHALL have a numeric **aisle number** (integer, 1-based, unique per layout) assigned along the primary customer flow. The aisle number SHALL be visible on the 2D floor plan.

#### Scenario: Autogen assigns sequential aisle numbers

- **GIVEN** a layout with fixture polygon and entry point
- **WHEN** Smart Generate creates six walk aisles
- **THEN** aisles are numbered 1 through 6 along the flow from entry
- **AND** each aisle displays its number on the canvas

### Requirement: Aisle-centric shelf labels

Shelf labels shown to users SHALL use the format **`{aisleNumber}{letter}`** where the letter identifies the shelf unit along that aisle (A, B, C, …). For dual-face fixtures, the front face SHALL use the customer-facing aisle number and the back face SHALL use the opposite aisle number behind the gondola spine.

#### Scenario: Shelves on aisle 4 labelled 4A and 4B

- **GIVEN** aisle 4 with two shelf units along its run
- **WHEN** the designer views the 2D floor plan
- **THEN** the shelves show labels **4A** and **4B**

#### Scenario: Back face uses opposite aisle

- **GIVEN** a dual-face gondola between aisle 4 (front) and aisle 5 (back)
- **WHEN** the designer selects the back face of the first unit
- **THEN** Properties and canvas show **5A** (not 4A)

#### Scenario: Selection label matches canvas badge

- **GIVEN** shelf label **4B** visible on canvas
- **WHEN** the designer clicks that shelf
- **THEN** Properties, Merchandising, and Planogram headers show **4B**

### Requirement: Store envelope dimension editing

The designer SHALL edit store **width** and **depth** in metres from the layout editor toolbar. Changes SHALL update the store envelope rectangle on the canvas and persist on the layout.

#### Scenario: Edit store width from toolbar

- **GIVEN** a layout with store envelope 20 m × 15 m
- **WHEN** the designer changes store width to 22 m in the toolbar
- **THEN** the outer envelope on canvas updates to 22 m × 15 m
- **AND** the value is persisted on save

### Requirement: Smart Generate aisle binding and labelling

After Smart Generate, each shelf face SHALL be bound to the correct walk aisle, and aisle-centric labels SHALL be assigned before the layout is saved.

#### Scenario: Autogen assigns aisle labels

- **GIVEN** an empty layout with fixture polygon
- **WHEN** Smart Generate completes
- **THEN** every generated shelf has `aisleId` and aisle-centric label
- **AND** no shelf or aisle is persisted outside the fixture polygon

## MODIFIED Requirements

### Requirement: Polygon floor area with strict containment

The system SHALL allow defining an irregular polygon fixture zone within a store envelope. The store envelope MAY be defined or adjusted by numeric width and depth as well as by drawing. Autogenerate and manual placement SHALL NOT persist fixtures outside the fixture polygon.

#### Scenario: Fixture zone inside numeric envelope

- **GIVEN** store envelope 20 m × 15 m entered in the toolbar
- **WHEN** the designer draws a fixture polygon inside it and applies
- **THEN** both envelope and polygon are visible in distinct styles
- **AND** shelves placed outside the polygon are rejected
