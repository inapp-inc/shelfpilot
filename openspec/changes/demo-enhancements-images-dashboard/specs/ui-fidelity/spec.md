## ADDED Requirements

### Requirement: Product images in 3D

The 3D view SHALL render product images on shelves where planogram placements exist, using
each product's `imageUrl` as a texture on a plane positioned on the shelf face. When a
product has no image or the image fails to load, the view SHALL fall back to the category
color block. Textures SHALL be cached by URL and the number of image planes per shelf MAY be
capped for performance.

#### Scenario: Shelf shows product images

- **GIVEN** a layout whose shelves have planogram placements for products with images
- **WHEN** the user opens the 3D view
- **THEN** the shelves display the product images on their faces

#### Scenario: Missing image falls back

- **GIVEN** a placed product without an image (or a broken URL)
- **WHEN** the 3D view renders that shelf
- **THEN** the category color block is shown instead, with no console errors
