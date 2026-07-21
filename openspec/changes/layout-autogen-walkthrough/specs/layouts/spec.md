## ADDED Requirements

### Requirement: Irregular floor polygon is editable and drives footprint
The system SHALL allow Designers to draw and edit a closed polygon floor boundary for a layout. Changing the polygon SHALL update the effective store area used for placement and generation.

#### Scenario: Apply drawn polygon
- **WHEN** a Designer closes a polygon with at least 3 vertices and saves
- **THEN** the layout `shape` is `polygon` and `polygon[]` stores vertices in meters

#### Scenario: Adjust area after draw
- **WHEN** a Designer moves a vertex or scales the polygon and saves
- **THEN** the layout footprint updates and containment is revalidated

### Requirement: Strict containment of aisles and shelves
Aisles and shelves SHALL be fully contained within the layout polygon (or rectangle bounds). The system SHALL reject placements and moves that exit the boundary.

#### Scenario: Reject move outside polygon
- **WHEN** a Designer PATCHes an aisle or shelf so its footprint exits the polygon
- **THEN** the API responds `400` with `containment_violation` and does not persist the change

#### Scenario: Generate stays inside
- **WHEN** autogenerate runs on a valid polygon
- **THEN** every emitted aisle and shelf footprint is fully inside the polygon

### Requirement: Rules-based aisle and shelf autogeneration
After a floor area exists, Designers and Admins SHALL be able to autogenerate aisles and shelves using a deterministic rules packer (no LLM). Density SHALL maximize compliant shelf count subject to configured minimum aisle clearance.

#### Scenario: Generate into empty layout
- **WHEN** a Designer calls autogenerate with `replaceExisting=false` on a layout with no shelves
- **THEN** aisles and shelves are created inside the polygon and categories remain unmapped

#### Scenario: Regenerate replaces after intent
- **WHEN** a Designer confirms regenerate with `replaceExisting=true`
- **THEN** prior aisles and shelves are replaced by the new generated set

#### Scenario: Viewer forbidden
- **WHEN** a Viewer POSTs autogenerate
- **THEN** the API responds `403`
