## ADDED Requirements

### Requirement: Viewport-fit layout editor

The layout editor SHALL fit the canvas and side rail within the viewport so that Properties, Merchandising, and Zones tabs are reachable without scrolling the page body. The canvas area SHALL support **Fit to view** and **Focus** actions to zoom/pan to the full floor plan, a mapped category's fixtures, or the current selection.

#### Scenario: Side rail tabs visible without body scroll

- **GIVEN** a standard laptop viewport (1366×768)
- **WHEN** the designer opens the layout editor
- **THEN** the tab strip for Properties / Merchandising / Zones is visible without scrolling the document

#### Scenario: Focus category zooms canvas

- **GIVEN** shelves mapped to category Fresh Produce
- **WHEN** the designer selects Focus → Fresh Produce
- **THEN** the canvas zooms and pans to frame those fixtures

### Requirement: Shelf identity in Properties panel

When a shelf is selected, the Properties panel SHALL show an editable **name/label** and the shelf display number and type.

#### Scenario: Edit shelf name

- **GIVEN** a selected shelf
- **WHEN** the designer edits the name field in Properties
- **THEN** the layout persists the updated label

## MODIFIED Requirements

### Requirement: Editor side rail tabs

The Properties, Merchandising, and Zones tabs SHALL remain visually aligned and fixed at the top of the side rail; only the panel body below the tabs SHALL scroll.

#### Scenario: Merchandising scroll does not misalign tabs

- **GIVEN** a shelf with a long planogram list in Merchandising
- **WHEN** the designer scrolls the panel content
- **THEN** the tab buttons remain aligned and do not shift horizontally
