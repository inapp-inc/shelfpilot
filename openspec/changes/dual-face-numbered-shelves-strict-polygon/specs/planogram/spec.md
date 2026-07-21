## ADDED Requirements

### Requirement: Dual-face planogram on gondola shelves

The system SHALL support independent planogram arrays per shelf **face** (`A` and `B`) when `doubleSided` is true, and SHALL scope category gating to the active face's category.

#### Scenario: Place product on Face B

- **GIVEN** a double-sided gondola with Face A mapped to `grocery` and Face B mapped to `chilled`
- **WHEN** a chilled-category product is placed on Face B level 0
- **THEN** the placement is stored on `faces[1].planogram` and Face A planogram is unchanged

#### Scenario: Face A category gates Face A only

- **GIVEN** Face A mapped to `beverages` and Face B mapped to `grocery`
- **WHEN** a grocery product is placed on Face A
- **THEN** the API returns 400 (category mismatch)

### Requirement: Planogram writes include faceId

The planogram POST/PATCH body SHALL accept optional `faceId` (`A` | `B`, default `A`). Single-sided shelves SHALL ignore `faceId` other than `A`.

#### Scenario: Default face on single-sided shelf

- **GIVEN** a shelf with `doubleSided: false`
- **WHEN** planogram placement omits `faceId`
- **THEN** the placement is stored on the sole face / legacy `planogram[]`

## MODIFIED Requirements

### Requirement: Category-gated product placement

The system SHALL only allow a product to be placed on a shelf **face** when the product's category is that face's mapped category or a descendant of it, and SHALL return `shelf_category_required` (400) when the face has no category mapping.

#### Scenario: Unmapped face rejects placement

- **GIVEN** Face B with no category mapping
- **WHEN** a planogram placement targets `faceId: B`
- **THEN** the API returns 400 with error `shelf_category_required`
