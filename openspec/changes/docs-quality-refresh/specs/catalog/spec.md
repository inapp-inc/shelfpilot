# ShelfPilot — Catalog (consolidated)

> **Staged baseline** for change `docs-quality-refresh`. On apply, this augments `openspec/specs/catalog/spec.md` with the product-update capability shipped in `merch-layers-polygon-fix` (SEED-ML-00).

## ADDED Requirements

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
