# planogram

## Purpose

Dimension-based shelf planogram: place products on shelf levels with category gating, compute facing capacity from product and shelf dimensions, and support multi-level placement per shelf type.

Consolidated from changes `layout-editor-planogram`, `layout-autogen-walkthrough`, `merch-layers-polygon-fix`, and `dual-face-numbered-shelves-strict-polygon`.

## Requirements

### Requirement: Add product to shelf level

The system SHALL allow Designer/Admin to place a catalog product on a specific shelf **level** with a facing count, computing maximum facings from product and usable shelf dimensions.

#### Scenario: Place product with facing capacity

- **GIVEN** a shelf with usableWidthMeters 1.2 and a product with widthMeters 0.2
- **WHEN** a planogram placement is created on level 0
- **THEN** maxFacings is 6 and facings is clamped to at most maxFacings

#### Scenario: Place different products on different levels

- **GIVEN** a shelf whose type resolves to at least 2 levels
- **WHEN** product A is placed on level 0 and product B on level 1
- **THEN** the shelf planogram contains both placements keyed by levelIndex

### Requirement: Viewer cannot mutate planogram

The system SHALL return 403 when a Viewer attempts planogram writes.

### Requirement: Category-gated product placement

The system SHALL only allow a product to be placed on a shelf when the product's category is the shelf's mapped category or a descendant of it, and SHALL return `shelf_category_required` (400) when the shelf has no category mapping.

#### Scenario: Unmapped shelf rejects placement

- **GIVEN** a shelf with no category mapping
- **WHEN** a planogram placement is attempted
- **THEN** the API returns 400 with error `shelf_category_required`

#### Scenario: Product outside category tree rejected

- **GIVEN** a shelf mapped to category `beverages`
- **WHEN** a product whose category is not `beverages` or a descendant is placed
- **THEN** the placement is rejected

#### Scenario: Descendant category allowed

- **GIVEN** a shelf mapped to `beverages` with child `soft-drinks`
- **WHEN** a product in `soft-drinks` is placed
- **THEN** the placement succeeds

### Requirement: Shelf-type default levels

The system SHALL derive a shelf's default level count and heights from its type template (e.g., shelf, gondola, rack, storage) when explicit levels are not provided.

#### Scenario: Gondola gets multiple levels

- **GIVEN** a shelf of type `gondola`
- **WHEN** it is created without explicit levels
- **THEN** the shelf is assigned the configured default number of levels for that type

### Requirement: Dual-face planogram on gondola shelves

The system SHALL support independent planogram arrays per shelf **face** (`A` and `B`) when `doubleSided` is true, and SHALL scope category gating to the active face's category.

#### Scenario: Place product on Face B

- **GIVEN** a double-sided gondola with Face A mapped to `grocery` and Face B mapped to `chilled`
- **WHEN** a chilled-category product is placed on Face B level 0
- **THEN** the placement is stored on `faces[1].planogram` and Face A planogram is unchanged

### Requirement: Planogram writes include faceId

The planogram POST body SHALL accept optional `faceId` (`A` | `B`, default `A`). Single-sided shelves SHALL use Face A / legacy `planogram[]`.

#### Scenario: Unmapped face rejects placement

- **GIVEN** Face B with no category mapping
- **WHEN** a planogram placement targets `faceId: B`
- **THEN** the API returns 400 with error `shelf_category_required`
