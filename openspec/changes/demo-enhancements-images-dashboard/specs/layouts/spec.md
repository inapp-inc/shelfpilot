## ADDED Requirements

### Requirement: Delete a layout

The system SHALL allow Designer/Admin to delete a layout via `DELETE /layouts/{layoutId}`,
removing the layout and any saved versions/snapshots. Unknown ids SHALL return 404 and
Viewers SHALL be rejected with 403. The UI SHALL offer delete from both the Layouts portfolio
and the layout editor, each with a confirmation.

#### Scenario: Designer deletes a layout

- **GIVEN** an existing layout
- **WHEN** a Designer confirms delete
- **THEN** the layout (and its versions) are removed and it no longer appears in the portfolio

#### Scenario: Viewer cannot delete

- **GIVEN** a Viewer session
- **WHEN** a delete is attempted
- **THEN** the API returns 403

#### Scenario: Delete from the editor returns to the portfolio

- **GIVEN** a layout open in the editor
- **WHEN** the user confirms Delete layout
- **THEN** the layout is deleted and the app navigates back to the Layouts list

### Requirement: Resize zones and aisles on the canvas

In edit mode, selecting a zone or an aisle SHALL show resize handles on the 2D canvas.
Dragging a handle SHALL change the entity's size (zone `widthMeters`/`depthMeters`; aisle
`widthMeters` and `lengthMeters`, orientation-aware) and persist it. Resizing SHALL be
clamped to the drawn polygon so a resize never creates a containment violation.

#### Scenario: Resize a zone within the floor

- **GIVEN** a selected zone in edit mode
- **WHEN** the user drags a corner handle outward within the drawn area
- **THEN** the zone grows and the new size persists

#### Scenario: Resize is clamped at the boundary

- **GIVEN** a selected aisle near the polygon edge
- **WHEN** the user drags a handle past the boundary
- **THEN** the size stops at the boundary and no containment violation is raised

#### Scenario: Aisle length is editable via API

- **GIVEN** an aisle
- **WHEN** `PATCH /layouts/{id}/aisles/{aisleId}` is sent with `lengthMeters`
- **THEN** the aisle length updates and containment is validated against its orientation
