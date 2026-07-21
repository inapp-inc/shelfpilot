## ADDED Requirements

### Requirement: Immersive 3D orbit and walkthrough
The 3D view SHALL support scroll zoom, orbit, and pan, plus a walk mode to move through the store. Placed planogram products SHALL be visible on shelf fronts/levels during 3D review.

#### Scenario: Orbit zoom
- **WHEN** the user scrolls in Orbit mode
- **THEN** the camera zooms without leaving the scene usable

#### Scenario: Enter walk mode
- **WHEN** the user enables Walk mode
- **THEN** they can move with keyboard and look with mouse, and see aisle/shelf geometry

#### Scenario: Products visible in 3D
- **GIVEN** a shelf with planogram facings
- **WHEN** viewing 3D (Orbit or Walk)
- **THEN** facing meshes for those products are rendered on the shelf
