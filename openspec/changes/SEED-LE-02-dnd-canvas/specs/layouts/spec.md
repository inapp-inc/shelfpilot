# Delta SEED-LE-02-dnd-canvas

### Requirement: SEED-LE-02-dnd-canvas

Palette drag-and-drop place/move for aisles and shelves with snap and PATCH persist.

#### Scenario: AC-1
- **THEN** Given shelf tool dragged from palette, When dropped on canvas, Then shelf is persisted at snapped coordinates.

#### Scenario: AC-2
- **THEN** Given existing shelf dragged, When mouseup, Then PATCH updates x/y.

