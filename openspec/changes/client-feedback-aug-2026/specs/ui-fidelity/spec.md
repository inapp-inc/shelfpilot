## ADDED Requirements

### Requirement: Kiosk store selection
When a kiosk user is permitted more than one store, the kiosk SHALL present a searchable, grouped store selector with large touch targets, and SHALL expose a persistent switcher to change store later. Retail stores and warehouses SHALL be grouped separately. Tabs SHALL NOT be used, as they do not scale beyond a few stores and consume space required by the map.

#### Scenario: Grouped picker
- **GIVEN** a kiosk user permitted two retail stores and one warehouse
- **WHEN** the picker opens
- **THEN** the retail stores appear under "Retail stores" and the warehouse under "Warehouses"

#### Scenario: Switching store resets context
- **GIVEN** a product is selected in store A
- **WHEN** the user switches to store B
- **THEN** the product selection and route are cleared, store B's layout and products load, and the URL becomes `/shop/{B}`

#### Scenario: Single permitted store
- **GIVEN** a kiosk user permitted exactly one store
- **THEN** neither the picker nor the switcher is shown and that store loads directly

### Requirement: Guided kiosk view gives the map primacy
When a product is selected, the kiosk SHALL enter a guided view in which the map is the dominant element, the finder collapses, and the view is framed to the route rather than the whole store.

#### Scenario: Map dominance on selection
- **WHEN** a product is selected
- **THEN** the map occupies at least 70 % of kiosk content width and the finder collapses to a single "Search again" bar

#### Scenario: Route framing
- **WHEN** the guided view is framed
- **THEN** the entrance marker, the entire route and the destination pin are all within the visible area, with margin

#### Scenario: Short route does not over-zoom
- **GIVEN** a target in the first aisle
- **THEN** the view does not zoom in past the minimum guided span

#### Scenario: Route legibility
- **GIVEN** a 1080p kiosk display
- **THEN** the route stroke renders at least 8 px wide with a halo, and the dash animates unless reduced motion is preferred

### Requirement: Walking line reaches the target shelf
The drawn route SHALL run from the entrance to the target shelf's face, not stop at the aisle centreline. No route segment SHALL cross a shelf interior.

#### Scenario: Route terminates at the shelf face
- **WHEN** a product on shelf 4A is selected
- **THEN** the final route vertex is the shelf-face approach point and the destination pin sits at that terminus

#### Scenario: Collision invariant preserved
- **GIVEN** any layout in the demo set
- **WHEN** a route is computed
- **THEN** no segment intersects a shelf interior

### Requirement: Read-only 2D store-plan view in the kiosk
The kiosk SHALL offer a read-only view of the store at true design geometry, selectable alongside the simplified map, with the same route overlay. The simplified map SHALL remain the default.

#### Scenario: Plan view renders design geometry
- **WHEN** the user selects "Store plan"
- **THEN** fixtures, aisles, zones and the floor polygon render at their designed positions and rotations, with the route and pin overlaid

#### Scenario: Plan view is not editable
- **WHEN** the user taps or drags anything in the plan view
- **THEN** nothing is selected, moved, resized or edited

#### Scenario: Context preserved across views
- **GIVEN** a selected product and a computed route
- **WHEN** the user toggles between "Simple map" and "Store plan"
- **THEN** the selection, route and framing are preserved

### Requirement: Three-shelf 3D context from the planogram
Opening 3D from the planogram SHALL render the target shelf together with its two adjacent shelves in the same aisle, all with their products, framed together. The originally selected shelf SHALL remain visually emphasised and SHALL be the shelf returned to on exit.

#### Scenario: Mid-aisle shelf
- **GIVEN** a shelf with neighbours on both sides
- **WHEN** "View in 3D" is used
- **THEN** three shelves render with products and all three are fully within the camera frame

#### Scenario: First shelf in an aisle
- **GIVEN** the target is the first shelf in its aisle
- **THEN** the target and the next two shelves render, with the target emphasised

#### Scenario: Last shelf in an aisle
- **GIVEN** the target is the last shelf in its aisle
- **THEN** the last three shelves render, with the target emphasised

#### Scenario: Short aisle
- **GIVEN** an aisle containing only one shelf
- **THEN** only that shelf renders and no error occurs

#### Scenario: Return to planogram
- **WHEN** the user exits 3D
- **THEN** the planogram reopens on the originally selected shelf and face

#### Scenario: Instance budget respected
- **GIVEN** three fully merchandised shelves in focus
- **THEN** total product instances stay within the global facing cap and the view remains interactive
