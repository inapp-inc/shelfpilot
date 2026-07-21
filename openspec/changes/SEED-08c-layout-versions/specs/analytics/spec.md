# analytics — delta for SEED-08c-layout-versions

## Purpose

Delta requirements for **SEED-08c-layout-versions**. Parent capability live specs: `openspec/specs/analytics/spec.md` (if present).

## Requirements

### Requirement: SEED-08c-layout-versions delivery

The system SHALL satisfy the goal: Demo layout versioning: snapshot on submit-for-review; list versions for compare.

#### Scenario: AC-1
- **GIVEN** draft submitted to in_review
- **WHEN** listing versions
- **THEN** at least one snapshot exists.

#### Scenario: AC-2
- **GIVEN** two version ids
- **WHEN** compare
- **THEN** deltas compute from snapshots.

