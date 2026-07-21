# planogram (consolidated)

> **Staged baseline** for change `docs-quality-refresh`. On apply, this replaces `openspec/specs/planogram/spec.md`, folding in the implemented behavior from `layout-editor-planogram`, `layout-autogen-walkthrough`, and `merch-layers-polygon-fix`.

## MODIFIED Requirements

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

## ADDED Requirements

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
