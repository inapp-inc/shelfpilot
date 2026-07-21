# ui-fidelity — delta for layout-editor-planogram

## Purpose

Modular Layout Editor components and upgraded 3D visualization aligned with ShelfPilot brand tokens. Parent: `openspec/specs/ui-fidelity/spec.md`.

## Requirements

### Requirement: Modular layout editor components

The Layout Editor SHALL be composed of separate reusable components (shell, canvas, palette, properties, category mapping, planogram, 3D) rather than a single monolithic page module.

#### Scenario: Editor loads modular shell

- **GIVEN** Designer opens a layout
- **WHEN** the Layout Editor page renders
- **THEN** aisle and shelf tools appear as separate palette groups
- **AND** properties panel switches fields by selection kind (aisle vs shelf)

### Requirement: Drag-and-drop from palette

The 2D canvas SHALL accept drag-and-drop of aisle and shelf tools from the palette.

#### Scenario: DnD place

- **GIVEN** shelf tool dragged from palette
- **WHEN** dropped on the floor plan
- **THEN** a shelf appears at snapped coordinates

### Requirement: Upgraded 3D shelf visualization

The 3D view SHALL render shelf levels and planogram facing blocks using mapped colors where present.

#### Scenario: 3D shows facings

- **GIVEN** a shelf with planogram placements
- **WHEN** user switches to 3D
- **THEN** facing blocks render without console errors
- **AND** WebGL resources dispose on unmount

### Requirement: Brand canvas tokens preserved

The 2D stage SHALL retain canvas wash `#e9e5e0` and floor `#fbfaf8` with brand crimson accents.
