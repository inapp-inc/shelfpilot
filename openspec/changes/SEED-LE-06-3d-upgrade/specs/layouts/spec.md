# Delta SEED-LE-06-3d-upgrade

### Requirement: SEED-LE-06-3d-upgrade

Richer Three.js view: aisle corridors, shelf levels, facing boxes, dispose on unmount.

#### Scenario: AC-1
- **THEN** Given shelf with planogram, When switching to 3D, Then facing blocks render without console errors.

#### Scenario: AC-2
- **THEN** Given leaving editor, When unmount, Then WebGL disposed.

