## ADDED Requirements

### Requirement: Store envelope and fixture zone boundaries

The layout SHALL persist a **store envelope** (full store width and depth from creation or explicit bounds) separately from the **fixture zone polygon** where shelves and aisles may be placed. When the designer applies a drawn polygon, the system SHALL save the polygon as the fixture zone and SHALL continue to render the full store envelope on the canvas in a visually distinct style from the fixture zone.

#### Scenario: Apply polygon inside larger store

- **GIVEN** a layout created as 20 m × 15 m and a polygon drawn inside it
- **WHEN** the designer clicks Apply area
- **THEN** the fixture polygon is saved
- **AND** the canvas shows the full 20×15 m envelope in a secondary colour
- **AND** the fixture polygon remains shown in the primary fixture-zone style

### Requirement: Editable fixture polygon

The designer SHALL be able to enter **Edit area** mode and drag polygon vertices (and optionally edges) to reshape the fixture zone after it has been applied, subject to minimum three vertices and valid ring validation.

#### Scenario: Reshape applied polygon

- **GIVEN** a layout with an applied fixture polygon
- **WHEN** the designer drags a vertex in Edit area mode and saves
- **THEN** the updated polygon is persisted on the layout

### Requirement: Autogenerate fixture-type mapping

Smart autogenerate SHALL accept a fixture type per category mix entry (shelf, gondola, rack, storage) and SHALL apply sensible defaults (e.g. fresh produce → storage). Generated shelves and aisles SHALL NOT be persisted outside the fixture polygon.

#### Scenario: Produce category uses storage

- **GIVEN** a category mix row for Fresh Produce with fixture type storage
- **WHEN** autogenerate runs
- **THEN** shelves assigned to that category are created with type storage

#### Scenario: No outside fixtures after autogen

- **GIVEN** an irregular fixture polygon
- **WHEN** autogenerate completes
- **THEN** validation.containmentViolations is empty for generated entities

### Requirement: Layout review with rejection comment

The system SHALL require a non-empty comment when an approver rejects a layout. The comment SHALL be stored on the layout and shown to the designer when status is rejected.

#### Scenario: Reject without comment blocked

- **GIVEN** a layout in review
- **WHEN** an approver attempts to reject with an empty comment
- **THEN** the rejection is not saved

#### Scenario: Designer sees rejection comment

- **GIVEN** a rejected layout with reviewComment "Aisle widths too narrow"
- **WHEN** a designer opens the layout
- **THEN** the rejection comment is displayed prominently

### Requirement: Review action button gating

The editor SHALL hide **Submit for review** after submission until the layout content changes again. The editor SHALL hide **Approve** and **Reject** except when the layout is in review awaiting decision, and SHALL hide them after approval until a new submission cycle.

#### Scenario: Submit hidden while in review unchanged

- **GIVEN** a layout just submitted (in_review) with no edits since submit
- **WHEN** a designer views the editor
- **THEN** Submit for review is not shown

#### Scenario: Submit reappears after edit

- **GIVEN** a layout in_review
- **WHEN** the designer moves a shelf
- **THEN** Submit for review becomes available again (or status returns to draft per workflow rule)

## MODIFIED Requirements

### Requirement: Polygon floor area with strict containment

The system SHALL allow defining an irregular polygon fixture zone within a store envelope, and SHALL reject placing or moving fixtures outside the polygon. Autogenerate SHALL NOT persist fixtures outside the polygon.

#### Scenario: Move shelf outside polygon rejected

- **GIVEN** a layout with a polygon fixture zone and a contained shelf
- **WHEN** the shelf is PATCHed outside the polygon
- **THEN** the API returns 400 with error containment_violation
