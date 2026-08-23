## MODIFIED Requirements

### Requirement: Single entrance per layout
A layout SHALL have **at most one** entrance. Setting an entrance when one already exists SHALL move the existing entrance rather than create a second one. Reads SHALL remain tolerant of legacy layouts containing more than one entrance, and writes SHALL canonicalise to one.

Previously: `layout.entryPoints[]` was an uncapped array and the editor appended a new entrance on each placement.

#### Scenario: Placing a second entrance moves the first
- **GIVEN** a layout with an entrance at (2, 0)
- **WHEN** the Designer sets an entrance at (8, 0)
- **THEN** the layout has exactly one entrance, located at (8, 0)

#### Scenario: Legacy multi-entrance layout canonicalised
- **GIVEN** a legacy layout with three entrances
- **WHEN** the layout is next written
- **THEN** the first entrance is retained, the others are removed, and an audit entry records the trim

#### Scenario: Layout without an entrance
- **GIVEN** a layout with no entrance
- **WHEN** a Customer opens the kiosk for it
- **THEN** the assumed front-of-store entrance is used and presented as assumed

#### Scenario: Entrance name reaches the kiosk
- **GIVEN** an entrance named "Main Door" in the layout editor
- **WHEN** the kiosk loads that store
- **THEN** the kiosk displays "Main Door" rather than the generic "Entrance"

## ADDED Requirements

### Requirement: Per-layout naming convention override
A layout MAY define a `namingConvention` that overrides the vertical-level default for that store only. When unset, the vertical default applies; when the vertical default is unset, the platform default applies. Naming SHALL NOT alter persisted geometry or structural fields.

#### Scenario: Layout override wins
- **GIVEN** a vertical default of `{aisle}{bay}` and a layout override of `{aisle}-{bay}`
- **WHEN** that layout is opened
- **THEN** its shelf codes render as `4-A` while other layouts in the same vertical still render `4A`

#### Scenario: Naming change does not touch geometry
- **GIVEN** a layout with generated aisles and shelves
- **WHEN** its naming convention changes
- **THEN** labels update on next render and no aisle, shelf, or planogram record is modified or regenerated

#### Scenario: Unset convention preserves current labels
- **GIVEN** a layout with no naming convention and a vertical with none
- **THEN** all labels match the existing platform format (`4A`, `Level 1`, `Position 1`)
