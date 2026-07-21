# ShelfPilot — Catalog (Products & Categories)

## Purpose

Maintain hierarchical categories and products with vertical-specific attributes (M3), including product create and update.

## Requirements

### Requirement: Category hierarchy

The system SHALL support nested categories per active vertical.

#### Scenario: List categories

- **GIVEN** vertical `pharmacy`
- **WHEN** categories are listed
- **THEN** a tree of categories for that vertical is returned

### Requirement: Product catalog

The system SHALL support products linked to categories with optional attributes.

#### Scenario: Create product

- **GIVEN** a category id
- **WHEN** a product is created
- **THEN** it appears in product list filtered by category

### Requirement: Bulk import/export (mock)

The system SHALL accept a mock bulk import payload and return exportable catalog JSON.

#### Scenario: Import categories

- **GIVEN** an Admin session and a JSON array of categories
- **WHEN** import is posted
- **THEN** categories are merged into the store

### Requirement: Product update

The system SHALL allow Designer/Admin to update an existing product's name, sku, categoryId, and attributes (including `widthMeters`/`heightMeters`) via `PATCH /products/{productId}`, returning 404 for unknown ids and 403 for Viewers.

#### Scenario: Update product attributes

- **GIVEN** an existing product
- **WHEN** a Designer PATCHes its name and widthMeters
- **THEN** the stored product reflects the new values

#### Scenario: Update unknown product

- **GIVEN** a productId that does not exist
- **WHEN** a PATCH is sent
- **THEN** the API returns 404 with error `not_found`

#### Scenario: Viewer cannot update

- **GIVEN** a Viewer session
- **WHEN** a product PATCH is attempted
- **THEN** the API returns 403

### Requirement: Category create from UI

The system SHALL allow Designer/Admin to create a category from the Catalog page with name, vertical, optional parent, and color via `POST /categories`.

#### Scenario: Add child category

- **GIVEN** a Designer on the Catalog page for pharmacy vertical
- **WHEN** they create category "First Aid" with parent "OTC Medicines"
- **THEN** the category appears in the tree and is selectable for products and shelf mapping

### Requirement: Hierarchical category selection

Product create/edit and shelf category mapping SHALL present categories in a hierarchical picker (parent groups, indented children).

#### Scenario: Product in child category

- **GIVEN** pharmacy categories with OTC parent and Pain Relief child
- **WHEN** a product is created with category Pain Relief
- **THEN** it appears when a shelf is mapped to OTC or Pain Relief

### Requirement: Catalog scoped to layout vertical in editor

When the Layout Editor is open, catalog data SHALL load for the layout's vertical, not a conflicting shell vertical.

#### Scenario: Retail layout uses retail catalog

- **GIVEN** a retail layout open in the editor
- **WHEN** the shell vertical pill differs from retail
- **THEN** the editor syncs to retail and shows retail categories/products

### Requirement: Import dialog with store-type selection

Starting an Excel import SHALL open a dialog that lets the user select the target store
type before importing. The store type SHALL default to the currently active store type.
The catalog SHALL be imported into the selected store type's vertical.

#### Scenario: Import into the chosen store type

- **GIVEN** the active store type is Retail and the user has a hypermarket product sheet
- **WHEN** the user clicks Import Excel, selects **Hypermarket**, and imports the file
- **THEN** the imported categories and products are stored under the **hypermarket** vertical
- **AND** the catalog view switches to Hypermarket

#### Scenario: Blank store type resolves to the selected type

- **GIVEN** a sheet whose rows have no `storeType` value
- **WHEN** the user imports it with **Hypermarket** selected
- **THEN** the rows are imported as hypermarket (not the previous `retail` fallback)

### Requirement: Drag-and-drop import

The import dialog SHALL accept a file via drag-and-drop as well as click-to-browse, for
`.xlsx`, `.xls`, and `.csv` files, and SHALL reject unsupported file types with a clear
message.

#### Scenario: Drop a file to import

- **GIVEN** the import dialog is open with a store type selected
- **WHEN** the user drags an `.xlsx` file onto the drop zone
- **THEN** the file is accepted and the Import action becomes available

#### Scenario: Unsupported file rejected

- **WHEN** the user drops a file that is not `.xlsx` / `.xls` / `.csv`
- **THEN** the dialog shows an error and does not start the import
