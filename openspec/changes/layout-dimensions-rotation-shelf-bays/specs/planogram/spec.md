## ADDED Requirements

### Requirement: Segment-scoped planogram capacity

When a planogram placement targets a shelf **segment**, the system SHALL compute
maximum facings from the segment's `widthMeters`, not the shelf's full usable width.

#### Scenario: Facings use segment width

- **GIVEN** a shelf with usableWidthMeters 3.6 split into a segment of widthMeters 1.2
- **AND** a product with widthMeters 0.2
- **WHEN** a planogram placement is created on that segment
- **THEN** maxFacings is 6 (not 18)

#### Scenario: Placement requires valid segmentId

- **GIVEN** a shelf with segments `[seg-a, seg-b]`
- **WHEN** a planogram placement references `segmentId: seg-b`
- **THEN** the placement is stored against segment `seg-b` and does not affect `seg-a`

#### Scenario: Invalid segmentId rejected

- **GIVEN** a shelf without segment `seg-z`
- **WHEN** a planogram placement targets `segmentId: seg-z`
- **THEN** the API returns 404 with error `segment_not_found`

### Requirement: Segment fill mode

Each segment's `fillMode` SHALL indicate whether the bay is intended to be fully
merchandised (`full`) or may retain deliberate empty space (`partial`). The editor
SHALL visualise partial segments with unused space on the canvas.

#### Scenario: Partial segment shows gap

- **GIVEN** a segment with fillMode `partial` and planogram facings that do not fill the segment width
- **WHEN** the shelf is selected on the canvas
- **THEN** the unused portion of that segment is visually distinct (e.g. hatched)

## MODIFIED Requirements

### Requirement: Add product to shelf level

The system SHALL allow Designer/Admin to place a catalog product on a specific shelf
**level** with a facing count, computing maximum facings from product and **segment or
shelf** usable dimensions. The planogram POST body SHALL accept optional `segmentId`
(default: single implicit full-width segment).

#### Scenario: Place product with facing capacity

- **GIVEN** a shelf with usableWidthMeters 1.2 and a product with widthMeters 0.2
- **WHEN** a planogram placement is created on level 0 without segmentId
- **THEN** maxFacings is 6 and facings is clamped to at most maxFacings

#### Scenario: Place product on segment level

- **GIVEN** a shelf with a segment of widthMeters 0.8
- **WHEN** a planogram placement is created with that segmentId on level 0
- **THEN** maxFacings is computed from 0.8 m, not the full shelf width
