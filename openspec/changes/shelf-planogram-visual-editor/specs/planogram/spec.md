## ADDED Requirements

### Requirement: Open Planogram action

When a Designer selects a **shelf-like fixture** (`shelf`, `rack`, `gondola`, or
`storage`) on the layout canvas, the editor SHALL provide an **Open Planogram**
control that opens a dedicated planogram editing surface for that fixture.

#### Scenario: Open from Merchandising panel

- **GIVEN** a shelf is selected and the layout is editable
- **WHEN** the Designer clicks **Open Planogram** in the Merchandising panel
- **THEN** the planogram editor opens for that shelf

#### Scenario: Read-only layout

- **GIVEN** the layout is in a read-only state (submitted or under review)
- **WHEN** the Designer opens the planogram editor
- **THEN** the grid is visible but add, split, and remove actions are disabled

### Requirement: Visual level-by-level planogram grid

The planogram editor SHALL render **one horizontal row per shelf level**, ordered with
level 0 at the bottom (floor) and higher levels above. Each row SHALL show products
placed on that level as visual blocks with facing count and fill ratio.

#### Scenario: Empty level row

- **GIVEN** a shelf with 3 levels and no placements on level 2
- **WHEN** the planogram editor is open
- **THEN** level 2 row shows empty bay cells with an add affordance

#### Scenario: Product block display

- **GIVEN** a placement of 4 facings with maxFacings 6 on level 1, bay 2
- **WHEN** the planogram editor renders that cell
- **THEN** the block shows the product name and a fill indicator of 4/6

### Requirement: Horizontal bay split in planogram editor

The planogram editor SHALL allow Designers to divide a shelf into **horizontal bays
(segments)** by **dragging vertical dividers** on the visual grid, with toolbar fallbacks
for equal split (2–12 bays) and merge to a single bay.

#### Scenario: Drag divider resizes bays

- **GIVEN** a shelf split into 2 bays
- **WHEN** the Designer drags the divider between them
- **THEN** adjacent segment widths update and persist on release

#### Scenario: Equal split updates grid

- **GIVEN** a shelf with usableWidthMeters 3.6 and one full-width bay
- **WHEN** the Designer splits equally into 3 bays
- **THEN** each level row shows 3 columns of equal proportional width

#### Scenario: Re-split with orphaned placements

- **GIVEN** placements exist on segment ids that would be removed by a re-split
- **WHEN** the Designer confirms the split
- **THEN** the system removes orphaned placements after explicit confirmation

### Requirement: Segment-scoped product placement in visual editor

Adding a product from the planogram editor SHALL target a specific **level**, **face**
(on dual-face fixtures), and **segment (bay)**. The Designer SHALL set **front facings**
and **depth facings (backstock)**. Facing capacity SHALL be computed from segment width
(shelf depth for depth facings). The preview API SHALL accept `segmentId`.

#### Scenario: Preview uses segment width

- **GIVEN** a bay of widthMeters 1.2 and a product widthMeters 0.2
- **WHEN** the Designer previews a product for that bay
- **THEN** maxFacings is 6

#### Scenario: Depth facings stored on placement

- **GIVEN** shelf depth 0.6 m and product depth 0.2 m (maxDepthFacings 3)
- **WHEN** the Designer adds a product with depthFacings 2
- **THEN** the placement is persisted with `depthFacings: 2` and `maxDepthFacings: 3`

#### Scenario: Placement stored with segmentId

- **GIVEN** segment `seg-b` on level 0
- **WHEN** the Designer adds a product with 3 facings to that bay
- **THEN** the placement is persisted with `segmentId: seg-b`, `levelIndex: 0`, and `facings: 3`

## MODIFIED Requirements

### Requirement: Add product to shelf level

The system SHALL allow Designer/Admin to place a catalog product on a specific shelf
**level** and optional **segment (bay)** with **front facings** and **depth facings**.
The planogram editor SHALL provide the primary visual surface for this action in addition
to the Merchandising panel form flow.

#### Scenario: Placement shows facings and depth

- **GIVEN** a placement with facings 4 and depthFacings 3
- **WHEN** the planogram editor renders the product block
- **THEN** the block shows 4 wide × 3 deep (or equivalent label)

#### Scenario: One SKU per bay per level (v1)

- **GIVEN** a bay on level 1 already contains a product placement
- **WHEN** the Designer attempts to add a different product to the same bay and level
- **THEN** the editor prompts to replace the existing product or cancel

#### Scenario: Dual-face placement

- **GIVEN** a dual-face storage shelf with Face A and Face B
- **WHEN** the Designer adds a product on Face B, level 0, bay 1
- **THEN** the placement is stored with `faceId: B` and does not appear on Face A
