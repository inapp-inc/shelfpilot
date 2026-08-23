## MODIFIED Requirements

### Requirement: Customer store access scope
A Customer SHALL be granted access to **one or more** stores (layouts). The system SHALL authorize every layout read against that permitted set. A Customer with exactly one granted store SHALL behave as today (direct load, no selection step).

Previously: a Customer was bound to exactly one layout via `shopperLayoutId`, and every other layout returned 403.

#### Scenario: Multiple stores granted
- **GIVEN** a Customer granted stores A, B and C
- **WHEN** they request `GET /shopper/stores`
- **THEN** exactly A, B and C are returned, each with name, store type and whether it is the default

#### Scenario: Non-granted store denied
- **GIVEN** a Customer granted only store A
- **WHEN** they request `GET /layouts/{B}` or `GET /shopper/kiosk?layoutId={B}`
- **THEN** the API responds **403**

#### Scenario: Single grant preserves current behaviour
- **GIVEN** a Customer granted exactly one store
- **WHEN** they sign in
- **THEN** that store loads directly and no store-selection step is presented

#### Scenario: Default store when none requested
- **GIVEN** a Customer with a default store set
- **WHEN** they request `GET /shopper/kiosk` without `layoutId`
- **THEN** the default store is returned

#### Scenario: Legacy assignment migrated
- **GIVEN** an existing Customer with a single `shopperLayoutId`
- **WHEN** the store-access migration runs
- **THEN** that layout is their granted and default store, and their kiosk behaviour is unchanged

## ADDED Requirements

### Requirement: Store grants are administered and audited
Only an Admin or SuperAdmin SHALL change a Customer's store grants, and each change SHALL be recorded in the audit log.

#### Scenario: Admin updates grants
- **WHEN** an Admin changes a Customer's granted stores
- **THEN** the change persists and an audit entry identifies the actor and the affected user

#### Scenario: Non-admin cannot change grants
- **GIVEN** a Designer, Approver, Viewer or Customer session
- **WHEN** it attempts to change store grants
- **THEN** the API responds **403**
