## ADDED Requirements

### Requirement: Different products per shelf level
A shelf SHALL support multiple levels. Designers SHALL place products on a selected level independently so different products can occupy different layers. Shelf type SHALL influence default level count via configuration templates.

#### Scenario: Place on level 1
- **GIVEN** a shelf with at least two levels and a mapped category
- **WHEN** the Designer selects level 1 and adds product A
- **THEN** the placement is stored with `levelIndex` 1 and does not replace level 0 placements

#### Scenario: Shelf type default levels
- **WHEN** a Designer places a gondola (or configured type) without custom levels
- **THEN** the shelf is initialized with the type’s default level count from config
