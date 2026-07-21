## ADDED Requirements

### Requirement: Aisle orientation

Each aisle SHALL carry an `orientation` (`horizontal` | `vertical`) describing its run
direction. Containment and rendering SHALL interpret the aisle footprint from its
orientation: for `horizontal`, X-extent = `lengthMeters` and Y-extent = `widthMeters`;
for `vertical`, X-extent = `widthMeters` and Y-extent = `lengthMeters`. Aisles without
`orientation` SHALL be treated as `horizontal` for backward compatibility.

#### Scenario: Vertical aisle stays inside polygon

- **GIVEN** a tall (portrait) polygon where autogenerate packs shelves in columns
- **WHEN** autogenerate runs
- **THEN** generated aisles have `orientation: "vertical"`
- **AND** each vertical aisle footprint is fully inside the polygon and is not dropped by containment

#### Scenario: Horizontal aisle footprint unchanged

- **GIVEN** a wide (landscape) polygon
- **WHEN** autogenerate runs
- **THEN** generated aisles have `orientation: "horizontal"` and pass containment as before

### Requirement: Autogenerate reports aisle count

The autogenerate response SHALL include the number of aisles generated alongside shelf
and skipped counts.

#### Scenario: Generate response includes aisleCount

- **GIVEN** a layout with room for multiple aisles
- **WHEN** autogenerate runs
- **THEN** the response `generated` block includes `aisles` (count ≥ 1) and `shelves`

### Requirement: Special zones

A layout SHALL support an optional `zones[]` collection. Each zone SHALL have an `id`,
a `type` (`hot` | `offer` | `special`), an optional user-defined `name`, an optional
`color`, and a rectangular footprint (`x`, `y`, `widthMeters`, `depthMeters`) in the
polygon coordinate space. Zones are merchandising overlays: they SHALL NOT participate
in aisle/shelf packing and SHALL survive autogenerate. A zone footprint SHALL be fully
inside the drawn polygon; creating or moving a zone outside it SHALL return
`containment_violation` (400).

#### Scenario: Create a hot zone inside the polygon

- **GIVEN** a layout with a drawn polygon
- **WHEN** a Designer creates a zone of type `hot` whose footprint fits inside the polygon
- **THEN** the zone is saved on the layout `zones[]` with its type and color

#### Scenario: User-defined special zone

- **GIVEN** a Designer wants a custom zone
- **WHEN** they create a zone of type `special` with name "Clearance"
- **THEN** the zone persists with `type: "special"` and `name: "Clearance"`

#### Scenario: Zone outside polygon rejected

- **GIVEN** a layout with a drawn polygon
- **WHEN** a Designer creates or moves a zone whose footprint extends outside the polygon
- **THEN** the API responds `containment_violation` (400) and the zone is not saved

#### Scenario: Zones survive autogenerate

- **GIVEN** a layout with existing zones
- **WHEN** autogenerate regenerates aisles and shelves
- **THEN** the `zones[]` collection is preserved unchanged

### Requirement: Mixed orientation autogenerate

Autogenerate SHALL support orientation values `mixed`, `auto`, `horizontal`, and
`vertical`. In `mixed` mode the floor SHALL be packed with both horizontal shelf rows
and vertical shelf columns (split along the longer axis with a corridor aisle between
the zones). `mixed` is the default orientation.

#### Scenario: Mixed produces both orientations

- **GIVEN** a rectangular or polygon floor large enough for multiple runs
- **WHEN** autogenerate runs with orientation `mixed`
- **THEN** the generated shelves include both non-rotated (row) and 90°-rotated (column) fixtures
- **AND** at least one aisle is generated

### Requirement: Aisles generated from interior runs

Autogenerate SHALL place aisles based on the actual interior span of the drawn polygon
at each aisle band (scan-based), not from a fixed edge anchor, so aisles are produced on
irregular / slanted drawn areas.

#### Scenario: Irregular polygon still gets aisles

- **GIVEN** an irregular (non-rectangular) drawn floor area with room for multiple shelf rows
- **WHEN** autogenerate runs
- **THEN** at least one aisle is generated inside the polygon between shelf blocks

### Requirement: Store entry points

A layout SHALL support an optional `entryPoints[]` collection. Each entry point SHALL
have an `id`, an optional `name`, a position (`x`, `y`), and a `widthMeters`. Entry
points are metadata describing store entrances and SHALL NOT alter fixture packing.

#### Scenario: Define an entry point

- **GIVEN** a layout with a drawn polygon
- **WHEN** a Designer places an entry point near an edge
- **THEN** the entry point is saved on `entryPoints[]` and returned with the layout

## MODIFIED Requirements

### Requirement: Autogenerate produces walkable aisles with visible spacing

Autogenerate SHALL interleave shelf blocks with aisles sized to at least the effective
minimum aisle width (clamped to a walkable minimum), leaving real space between shelf
rows/columns. Aisles SHALL only be emitted when a full aisle band fits inside the
polygon.

#### Scenario: Aisles separate shelf blocks

- **GIVEN** a polygon large enough for two or more shelf rows
- **WHEN** autogenerate runs
- **THEN** at least one aisle is generated between shelf blocks
- **AND** the aisle band width is ≥ the effective minimum aisle width
