# planogram — capability for layout-editor-planogram

## Purpose

Dimension-based shelf planogram: place products on a shelf face/level and compute facing capacity from product and shelf dimensions.

## Requirements

### Requirement: Add product to shelf front

The system SHALL allow Designer/Admin to place a catalog product on a shelf level with a facing count.

#### Scenario: Place product

- **GIVEN** a shelf with usableWidthMeters 1.2 and a product with widthMeters 0.2
- **WHEN** POST planogram placement for that product on level 0
- **THEN** maxFacings is 6 and facings defaults to maxFacings unless a lower value is supplied

### Requirement: Facing count from dimensions

The system SHALL compute maxFacings as floor(usableWidthMeters / productWidthMeters).

#### Scenario: Narrower product yields more facings

- **GIVEN** usable width 1.0m
- **WHEN** product width is 0.25m
- **THEN** maxFacings is 4

### Requirement: Clamp facings

The system SHALL reject or clamp facings above maxFacings.

#### Scenario: Over-facing clamped or rejected

- **GIVEN** maxFacings 4
- **WHEN** client requests facings 9
- **THEN** API returns 400 or stores facings=4 (implementation chooses clamp; OpenAPI documents chosen behavior as clamp)

### Requirement: Viewer cannot mutate planogram

The system SHALL forbid Viewer from creating planogram placements.

#### Scenario: Viewer forbidden

- **GIVEN** Viewer token
- **WHEN** POST planogram placement
- **THEN** 403

### Requirement: Suggested shelf levels from height

When product and shelf heights are present, the system SHALL expose suggestedLevels = floor(shelfHeight / productHeight) as advisory metadata on preview/placement response.

#### Scenario: Height-based levels

- **GIVEN** shelf height 2.0m and product height 0.4m
- **WHEN** planogram preview is requested
- **THEN** suggestedLevels is 5
