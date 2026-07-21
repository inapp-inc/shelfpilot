# ui-fidelity — delta for SEED-07c-viz-3d

## Purpose

Delta requirements for **SEED-07c-viz-3d**. Parent capability live specs: `openspec/specs/ui-fidelity/spec.md` (if present).

## Requirements

### Requirement: SEED-07c-viz-3d delivery

The system SHALL satisfy the goal: Three.js 3D view with floor, grid, fixtures colored by mapping; safe teardown.

#### Scenario: AC-1
- **GIVEN** layout with mapped fixtures
- **WHEN** switching to 3D
- **THEN** scene renders without console errors.

#### Scenario: AC-2
- **GIVEN** leaving editor
- **WHEN** unmounting
- **THEN** WebGL context is disposed.

