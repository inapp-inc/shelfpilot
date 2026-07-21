## ADDED Requirements

### Requirement: Autogenerate stays inside the drawn polygon
Autogenerate SHALL place aisles and shelves such that every footprint is fully inside the layout’s drawn polygon (not only its bounding box). Entities that cannot fit SHALL be omitted.

#### Scenario: L-shaped polygon generate
- **GIVEN** a non-rectangular polygon floor
- **WHEN** Designer runs autogenerate
- **THEN** zero aisles or shelves have containment violations

#### Scenario: Aisle length clipped
- **WHEN** an aisle corridor would extend outside the polygon
- **THEN** its `lengthMeters` is clipped so the footprint remains inside, or the aisle is omitted
