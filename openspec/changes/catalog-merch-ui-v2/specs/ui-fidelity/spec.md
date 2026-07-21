# ui-fidelity (delta)

> Staged for change `catalog-merch-ui-v2`.

## ADDED Requirements

### Requirement: Catalog master-detail layout

The Products & Categories page SHALL use a category tree sidebar that filters the product table, with Add category and Add product actions opening slide-over drawers.

#### Scenario: Filter products by category

- **GIVEN** a category selected in the tree
- **WHEN** the product table renders
- **THEN** only products in that category (and optionally descendants) are listed

### Requirement: Editor merchandising tab

The Layout Editor right rail SHALL use tabs separating Properties from a guided Merchandising flow (category assignment then per-level planogram).

#### Scenario: Guided shelf merchandising

- **GIVEN** a selected shelf in the editor
- **WHEN** the Merchandising tab is active
- **THEN** the user assigns a category then places products by level without scrolling past unrelated panels

### Requirement: Quick-add product from planogram

When no products match a shelf's category tree, the Merchandising panel SHALL offer a quick-add product action pre-filled with that category.

#### Scenario: Empty category product list

- **GIVEN** a shelf mapped to Seasonal with zero products
- **WHEN** the planogram step renders
- **THEN** a call-to-action opens the product drawer with category pre-selected
