# layouts — delta for layout-editor-planogram

## Purpose

Extend layout canvas behavior: first-class aisles vs shelves, DnD persistence, separate category mapping, shelf geometry/levels. Parent: `openspec/specs/layouts/spec.md`.

## Requirements

### Requirement: First-class aisle and shelf entities

The system SHALL model aisles and shelves as distinct layout entities with independent properties.

#### Scenario: Aisle width independent of shelf height

- **GIVEN** a layout with an aisle and a shelf
- **WHEN** the Designer sets aisle widthMeters to 1.6 and shelf heightMeters to 2.1
- **THEN** GET layout returns both values unchanged on their respective entities

### Requirement: Optional aisle ownership of shelves

The system SHALL allow a shelf to reference an aisleId without requiring it.

#### Scenario: Shelf linked to aisle

- **GIVEN** aisle `a1` and shelf `s1`
- **WHEN** shelf is patched with aisleId `a1`
- **THEN** GET layout shows shelf.aisleId = a1

### Requirement: Drag-and-drop position persistence

The system SHALL persist aisle and shelf positions after drag-and-drop on the canvas.

#### Scenario: Drop shelf on canvas

- **GIVEN** Designer in edit mode
- **WHEN** a shelf is dropped at snapped grid coordinates
- **THEN** PATCH/POST persists x,y and subsequent GET returns those coordinates

### Requirement: Separate category mapping for aisle and shelf

The system SHALL support category mapping on shelves independently from aisles.

#### Scenario: Shelf category does not overwrite aisle

- **GIVEN** aisle mapped to category Circulation and shelf mapped to OTC
- **WHEN** GET layout
- **THEN** aisle and shelf each retain their own categoryId and color

### Requirement: Shelf levels configuration

The system SHALL allow configuring per-shelf levels (height from floor and clearance).

#### Scenario: Configure two levels

- **GIVEN** a shelf with heightMeters 2.0
- **WHEN** Designer saves two levels with clearances
- **THEN** GET shelf.levels has length 2 with levelIndex 0 and 1
