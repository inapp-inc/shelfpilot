## ADDED Requirements

### Requirement: Planogram editor modal UI

The layout editor SHALL provide a **planogram editor modal** (or approved alternative
from REVIEW.md) that overlays the workspace when **Open Planogram** is activated.

#### Scenario: Modal header context

- **GIVEN** shelf displayNumber 12, type storage, usable width 3.6 m
- **WHEN** the planogram editor opens
- **THEN** the header shows shelf number, type, and key dimensions

#### Scenario: Face toggle for dual-face fixtures

- **GIVEN** a dual-face storage shelf
- **WHEN** the planogram editor is open
- **THEN** Face A and Face B toggles are visible and switch the displayed planogram grid

#### Scenario: Dismiss modal

- **WHEN** the Designer clicks Close or presses Escape
- **THEN** the modal closes and canvas selection is unchanged

### Requirement: Draggable bay dividers

The planogram grid SHALL render **draggable vertical dividers** between bay columns.
Dragging a divider SHALL resize adjacent segments proportionally across all level rows.
Minimum bay width SHALL be 0.2 m.

#### Scenario: Divider drag persists segments

- **GIVEN** a shelf with 2 bays in the planogram editor
- **WHEN** the Designer drags the divider and releases
- **THEN** `shelf.segments[]` is updated via PATCH and columns reflow

### Requirement: Segment column proportions

In the planogram grid, each bay column width SHALL be **proportional** to
`segment.widthMeters / shelf.usableWidthMeters`. Segments with `fillMode: partial`
SHALL show visually distinct unused space when facings do not fill the bay.

#### Scenario: Partial fill visualization

- **GIVEN** a segment with fillMode `partial` and facings that use 50% of bay width
- **WHEN** the planogram editor renders that cell
- **THEN** the unused portion is hatched or otherwise visually distinct

### Requirement: Planogram entry points

**Open Planogram** SHALL appear in the Merchandising panel when a shelf-like fixture
is selected. A secondary entry point MAY appear in the Properties panel.

#### Scenario: No planogram for aisles

- **GIVEN** an aisle is selected
- **WHEN** the Merchandising panel is shown
- **THEN** Open Planogram is not offered (aisles support category mapping only)

## MODIFIED Requirements

### Requirement: Merchandising panel planogram flow

The Merchandising panel SHALL retain category assignment and quick-add planogram
controls. The **visual planogram editor** SHALL be the recommended surface for
level × bay merchandising after category is assigned.

#### Scenario: Open Planogram before category assigned

- **GIVEN** a shelf with no category on the active face
- **WHEN** the Designer opens the planogram editor
- **THEN** the grid is shown with a prompt to assign a category before adding products
