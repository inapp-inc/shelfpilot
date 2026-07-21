## ADDED Requirements

### Requirement: Designers can create and update products
The system SHALL allow Designers and Admins to create new products and update existing products (name, SKU, category, dimension attributes) via the catalog UI and API.

#### Scenario: Create product from catalog
- **WHEN** a Designer submits a valid new product form
- **THEN** the product is persisted and appears in the catalog list and planogram pickers

#### Scenario: Update product
- **WHEN** a Designer PATCHes an existing product’s name or dimensions
- **THEN** subsequent planogram facing previews use the updated attributes
