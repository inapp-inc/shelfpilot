## ADDED Requirements

### Requirement: Shelf category gates and filters planogram products
A shelf SHALL have at most one `categoryId`. Planogram product selection SHALL include products in that category and all descendant categories. Placement SHALL be blocked until a category is assigned.

#### Scenario: Unmapped shelf cannot receive products
- **WHEN** a Designer POSTs planogram to a shelf with null `categoryId`
- **THEN** the API responds `400` with `shelf_category_required`

#### Scenario: Filter includes child categories
- **GIVEN** shelf category `otc` with child `painrelief` and product in `painrelief`
- **WHEN** the Designer opens the planogram product list for that shelf
- **THEN** the painrelief product is listed

#### Scenario: Unrelated category excluded
- **GIVEN** shelf category `otc`
- **WHEN** the product list is shown
- **THEN** products only under unrelated roots (e.g. unrelated vertical branches) are not listed
