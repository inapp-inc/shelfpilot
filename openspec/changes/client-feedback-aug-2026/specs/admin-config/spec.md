## ADDED Requirements

### Requirement: Configurable aisle, bay, shelf and position nomenclature
Vertical configuration SHALL support an optional `namingConvention` describing how aisle, bay, level and position identifiers are formatted, including a composed shelf-code pattern. The platform default SHALL reproduce the existing format exactly, so unconfigured deployments see no change.

#### Scenario: Default parity
- **GIVEN** a vertical with no `namingConvention`
- **THEN** shelf codes render as `4A`, levels as `Level 1`, and positions as `Position 1`

#### Scenario: Admin sets a separator pattern
- **GIVEN** an Admin sets the shelf-code pattern to `{aisle}-{bay}`
- **WHEN** a layout in that vertical is opened
- **THEN** the editor, planogram, 3D labels, kiosk directions and find-product results all show `4-A`

#### Scenario: Zero-padded aisle numbers
- **GIVEN** an aisle style with padding 2 and pattern `{aisle}-{bay}`
- **THEN** aisle 4 bay A renders as `04-A`

#### Scenario: Numeric bays
- **GIVEN** a bay style of `number`
- **THEN** the first bay of aisle 4 renders as `41` under pattern `{aisle}{bay}`, and "Go to shelf" accepts that format

#### Scenario: Only Admin may change naming
- **GIVEN** a Designer, Approver or Viewer session
- **WHEN** it attempts to update `namingConvention` via `PUT /admin/config`
- **THEN** the API responds **403**

### Requirement: Naming configuration is presentation-only
The naming convention SHALL affect formatting only. Structural fields (`aisleNumber`, `shelfIndexAlongAisle`) remain the persisted source of truth and SHALL NOT be rewritten when a convention changes.

#### Scenario: No migration required
- **WHEN** a naming convention is added, changed, or removed
- **THEN** no layout, aisle, shelf, or planogram record requires migration and no formatted label is persisted
