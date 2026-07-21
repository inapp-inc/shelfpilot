## ADDED Requirements

### Requirement: Fixture dimension overlays

The layout editor SHALL display physical dimensions for aisles and shelves. Each aisle
SHALL show its run length and aisle width on the 2D canvas (e.g. `8.0×1.2 m`). A
selected shelf SHALL show its usable width and depth on the canvas and in the selection
bar. Height SHALL remain editable and visible in the Properties panel.

#### Scenario: Selected shelf shows dimensions

- **GIVEN** a shelf with usableWidthMeters 1.2 and depthMeters 0.6
- **WHEN** the Designer selects that shelf on the canvas
- **THEN** the canvas and selection bar display `1.2 m × 0.6 m` (or equivalent formatting)

#### Scenario: Aisle shows run and width

- **GIVEN** a horizontal aisle with lengthMeters 8 and widthMeters 1.2
- **WHEN** the layout is viewed on the 2D canvas
- **THEN** the aisle walkway label includes `8.0×1.2 m` without requiring hover

### Requirement: Client-side polygon containment during drag

While dragging a shelf or aisle, the editor SHALL NOT preview a position whose footprint
is not fully inside the drawn polygon. The server SHALL remain authoritative and return
`containment_violation` (400) on invalid PATCH/POST.

#### Scenario: Drag blocked at polygon edge

- **GIVEN** a layout with an L-shaped drawn polygon and a shelf fully inside it
- **WHEN** the Designer drags the shelf toward the outside of the polygon
- **THEN** the shelf stops at the last valid inside position and is not placed outside

#### Scenario: Outside shelf visible as violation

- **GIVEN** a shelf whose footprint is outside the polygon (validation violation)
- **WHEN** the layout is rendered on the 2D canvas
- **THEN** the shelf is shown with a distinct violation outline and appears in the validation banner

### Requirement: Arbitrary shelf rotation

A shelf SHALL support `rotationDeg` from 0 up to (but not including) 360. Containment
SHALL test all four corners of the rotated footprint inside the polygon. The 2D canvas
and 3D view SHALL render the shelf at the saved rotation.

#### Scenario: Rotate shelf inside polygon

- **GIVEN** a square polygon and a shelf that fits at 45° rotation
- **WHEN** the Designer sets rotationDeg to 45 and saves
- **THEN** the shelf persists at 45° and validation reports no containment violation

#### Scenario: Rotate shelf outside polygon rejected

- **GIVEN** a shelf near a polygon corner
- **WHEN** rotationDeg is PATCHed such that a corner lies outside the polygon
- **THEN** the API returns 400 with error `containment_violation`

#### Scenario: Backward compatible rotation

- **GIVEN** a legacy shelf with rotationDeg 0 or 90
- **WHEN** the layout is loaded
- **THEN** footprint and rendering match existing behaviour

### Requirement: Shelf segments (bay split)

A shelf MAY include an optional `segments[]` array dividing its usable width into bays.
Each segment SHALL have `id`, `offsetMeters`, `widthMeters`, and `fillMode`
(`full` | `partial`). The sum of segment widths plus offsets SHALL NOT exceed
`usableWidthMeters`. Segments SHALL NOT overlap.

#### Scenario: Split shelf into equal bays

- **GIVEN** a shelf with usableWidthMeters 3.6
- **WHEN** the Designer splits it into 3 equal segments
- **THEN** the layout stores 3 segments each with widthMeters 1.2 and offsets 0, 1.2, 2.4

#### Scenario: Overlapping segments rejected

- **GIVEN** a shelf with two segments whose intervals overlap
- **WHEN** the segments are PATCHed
- **THEN** the API returns 400 with error `segment_overlap`

#### Scenario: Default single segment

- **GIVEN** a shelf with no `segments` array
- **WHEN** the layout is normalized
- **THEN** the shelf behaves as one full-width segment for planogram purposes

## MODIFIED Requirements

### Requirement: Polygon floor area with strict containment

The system SHALL allow defining an irregular polygon floor area, and SHALL reject
placing or moving a shelf/aisle whose footprint is not fully inside the polygon,
returning `containment_violation` (400). The editor SHALL enforce the same rule during
drag preview and SHALL NOT hide violating shelves from the canvas.

#### Scenario: Move shelf outside polygon rejected

- **GIVEN** a layout with a polygon floor area and a contained shelf
- **WHEN** the shelf is PATCHed to a position outside the polygon
- **THEN** the API returns 400 with error `containment_violation`

#### Scenario: Validation reports containment violations

- **GIVEN** a layout with a polygon and entities
- **WHEN** validation runs
- **THEN** `validation.containmentViolations` lists any entity outside the polygon
- **AND** those entities remain visible on the canvas with violation styling
