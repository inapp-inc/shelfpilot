# catalog (delta)

> Staged for change `catalog-merch-ui-v2`. Apply to baseline on implementation.

## ADDED Requirements

### Requirement: Category create from UI

The system SHALL allow Designer/Admin to create a category from the Catalog page with name, vertical, optional parent, and color via `POST /categories`.

#### Scenario: Add child category under OTC

- **GIVEN** a Designer on the Catalog page for pharmacy vertical
- **WHEN** they create category "First Aid" with parent "OTC Medicines"
- **THEN** the category appears in the tree and is selectable for products and shelf mapping

### Requirement: Hierarchical category selection

Product create/edit and shelf category mapping SHALL present categories in a hierarchical picker (parent groups, indented children).

#### Scenario: Product assigned to child category

- **GIVEN** pharmacy categories with OTC parent and Pain Relief child
- **WHEN** a product is created with category Pain Relief
- **THEN** it appears when a shelf is mapped to OTC or Pain Relief

### Requirement: Catalog scoped to layout vertical in editor

When the Layout Editor is open, catalog data (categories and products) SHALL load for the layout's vertical, not a conflicting shell vertical.

#### Scenario: Retail layout uses retail catalog

- **GIVEN** a retail layout open in the editor
- **WHEN** the shell vertical pill differs from retail
- **THEN** the editor syncs to retail and shows retail categories/products
