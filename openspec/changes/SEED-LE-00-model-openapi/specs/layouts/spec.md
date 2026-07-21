# Delta SEED-LE-00-model-openapi

### Requirement: SEED-LE-00-model-openapi

OpenAPI + layout payload model for aisles/shelves/planogram; migrate fixtures→shelves on read.

#### Scenario: AC-1
- **THEN** Given legacy layout with fixtures only, When GET layout, Then shelves array is populated from fixtures.

#### Scenario: AC-2
- **THEN** Given OpenAPI, When openapi:check runs after route implementation, Then new shelf/planogram ops are documented.

