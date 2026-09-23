# Layouts — delta: fixture plan import

**Parent change:** `plan-fixture-import`  
**Baseline:** `openspec/specs/layouts/spec.md` (fold when PI-10 completes)

## ADDED Requirements

### Requirement: Fixture-level floor plan import

The system SHALL accept an extended `floorPlanImport` payload on layout create that includes parsed fixture **runs** (length, depth, kind, bay/level counts) and SHALL materialize native **aisles** and **shelves** when `importMode` is `fixture` and the feature is enabled.

#### Scenario: Fixture import from parsed runs

- **GIVEN** a valid `floorPlanImport` with `importMode: "fixture"` and at least one run with `lengthMeters > 0`
- **WHEN** the client POSTs `/layouts` with fixture import enabled
- **THEN** the response layout includes non-empty `shelves` and `aisles` derived from runs
- **AND** `importSource.fixtureImport` records scale method, run count, warnings, and parser version
- **AND** generic packer autogenerate is not used for that request unless the user opts into fallback

#### Scenario: Envelope-only import unchanged

- **GIVEN** `floorPlanImport` without `importMode: fixture` or with empty `runs`
- **WHEN** the client POSTs `/layouts` with existing envelope import fields
- **THEN** behaviour matches the pre–fixture-import create path (polygon + optional packer)

#### Scenario: Planogram fill preserves imported geometry

- **GIVEN** a layout created via fixture import
- **WHEN** Smart Generate or autofill runs with `fillPlanogram` enabled
- **THEN** existing shelf positions and identities are not removed unless the user explicitly regenerates layout fixtures
