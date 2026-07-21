# Delta SEED-LE-04-category-separate

### Requirement: SEED-LE-04-category-separate

Independent category mapping for aisles vs shelves.

#### Scenario: AC-1
- **THEN** Given aisle and shelf mapped to different categories, When GET layout, Then each retains its categoryId/color.

#### Scenario: AC-2
- **THEN** Given Viewer, When mapping shelf, Then 403.

