## ADDED Requirements

### Requirement: Planogram picker reflects current catalog

The layout-editor merchandising planogram product picker SHALL reflect the current
catalog for the layout's vertical. The catalog SHALL be (re)loaded when the layout
editor opens and after a catalog import completes, so newly imported or edited products
are available for placement without a full app reload.

#### Scenario: Imported products appear in planogram

- **GIVEN** a Designer imports products from Excel for a vertical
- **AND** opens a layout of that vertical and assigns a category to a shelf face
- **WHEN** the merchandising planogram picker is shown
- **THEN** the imported products in that category (or its descendants) are listed

#### Scenario: Refresh updates the picker

- **GIVEN** the planogram picker is open for a shelf face with a category
- **WHEN** the Designer triggers refresh after adding products in Catalog
- **THEN** the picker list updates to include the new products

### Requirement: Planogram picker empty-states are explicit

The planogram picker SHALL distinguish between "no category assigned to this face" and
"category assigned but no products available", and SHALL show a product count when
products are listed.

#### Scenario: No category assigned

- **GIVEN** a shelf face with no category
- **WHEN** the planogram picker is shown
- **THEN** it prompts the Designer to assign a category to the face

#### Scenario: Category with no products

- **GIVEN** a shelf face whose category has no products
- **WHEN** the planogram picker is shown
- **THEN** it states there are no products in that category and offers a refresh
