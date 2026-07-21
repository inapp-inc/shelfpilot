# Delta SEED-LE-05-planogram-facings

### Requirement: SEED-LE-05-planogram-facings

Add products to shelf front; compute/clamp facings from dimensions.

#### Scenario: AC-1
- **THEN** Given usableWidth 1.2 and product width 0.2, When POST placement, Then maxFacings is 6.

#### Scenario: AC-2
- **THEN** Given facings request 9 and max 4, When POST, Then facings stored as 4 (clamp).

#### Scenario: AC-3
- **THEN** Given Viewer, When POST placement, Then 403.

