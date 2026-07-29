## MODIFIED Requirements

### Requirement: Numbered shelf badges without type labels

The 2D canvas SHALL display shelf **face labels** instead of fixture type text (`shelf`, `gondola`). Each shelf unit is identified by a **letter** derived from sequential `displayNumber` (1→A, 2→B, …). Each face on a dual-sided fixture SHALL show `{letter}{faceDigit}` where face digit 1 = Face A and 2 = Face B (e.g. **A1**, **A2**, **B1**, **B2**). A **shelf number legend** SHALL map each face label to its category name.

#### Scenario: Single-sided shelf badge

- **GIVEN** a shelf with `displayNumber: 5` mapped to Grocery and `doubleSided: false`
- **WHEN** the 2D canvas renders
- **THEN** the badge shows `E1` with Grocery color
- **AND** no `shelf` type label is shown

#### Scenario: Dual-sided gondola badge

- **GIVEN** gondola `displayNumber: 2` with Face A Grocery and Face B Chilled
- **WHEN** the 2D canvas renders
- **THEN** the fixture shows **B1** and **B2** on opposite halves with respective colors

### Requirement: Merchandising face selector

The Merchandising tab SHALL provide face selection when the selected shelf is double-sided, using **face labels** (`A1 | A2` for shelf A, `B1 | B2` for shelf B, etc.). Planogram level selector and product list SHALL reflect the active face's category.

#### Scenario: Switch face updates product filter

- **GIVEN** a double-sided gondola `displayNumber: 1` with Face A = Beverages and Face B = Snacks
- **WHEN** the user selects **A2** in Merchandising
- **THEN** the product picker lists Snacks subtree only
