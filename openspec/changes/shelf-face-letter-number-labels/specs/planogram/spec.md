## MODIFIED Requirements

### Requirement: Face-scoped bay segments

On dual-sided fixtures, each face SHALL maintain its own `segments[]` array for bay splits. Splitting bays on Face A SHALL NOT change the segment layout on Face B.

#### Scenario: Independent face splits

- **GIVEN** a dual-face gondola with Face A split into 2 bays and Face B left as 1 bay
- **WHEN** the Designer opens the planogram editor for Face B
- **THEN** the grid shows a single full-width bay
- **AND** Face A still shows 2 bays

#### Scenario: PATCH segments scoped to face

- **GIVEN** a dual-face shelf
- **WHEN** the Designer PATCHes `segments` with `faceId: B`
- **THEN** only Face B segments are updated
- **AND** Face A segments are unchanged
