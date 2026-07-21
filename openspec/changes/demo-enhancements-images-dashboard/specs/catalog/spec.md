## ADDED Requirements

### Requirement: Product image

A product SHALL support an optional `imageUrl` (an image URL or a data URL). It SHALL be
accepted on `POST /products` and `PATCH /products/{productId}` and persisted. The product
edit form SHALL allow uploading an image (drag-and-drop or browse, shown as a thumbnail) or
pasting an image URL, with a control to remove it. Uploaded files SHALL be resized
client-side before saving to keep payloads small.

#### Scenario: Attach an image to a product

- **GIVEN** the product edit drawer
- **WHEN** the user uploads an image and saves
- **THEN** the product stores `imageUrl` and the catalog shows its thumbnail

#### Scenario: Product image via URL

- **GIVEN** the product edit drawer
- **WHEN** the user pastes an image URL and saves
- **THEN** the product stores that `imageUrl`

### Requirement: Import product images

The Excel import template and parser SHALL support an optional `imageUrl` column (an image
URL). When present, the value SHALL be stored on the imported product; blank is allowed.

#### Scenario: Import a sheet with image URLs

- **GIVEN** an Excel file whose product rows include an `imageUrl` column
- **WHEN** the file is imported
- **THEN** the imported products carry those image URLs

### Requirement: Clean Save/Cancel controls on the product form

The product edit drawer SHALL present aligned, consistent **Cancel** (secondary) and
**Save product** (primary) controls in a footer, with Save disabled for non-editors.

#### Scenario: Cancel discards edits

- **GIVEN** the product edit drawer with unsaved changes
- **WHEN** the user clicks Cancel
- **THEN** the drawer closes without saving
