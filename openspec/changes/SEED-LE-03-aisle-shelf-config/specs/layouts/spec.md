# Delta SEED-LE-03-aisle-shelf-config

### Requirement: SEED-LE-03-aisle-shelf-config

Configure aisle corridor width/space and per-shelf height, usable width, and levels.

#### Scenario: AC-1
- **THEN** Given aisle selected, When widthMeters set to 1.6, Then GET returns 1.6 on aisle only.

#### Scenario: AC-2
- **THEN** Given shelf selected, When height and two levels saved, Then GET shelf.levels length is 2.

