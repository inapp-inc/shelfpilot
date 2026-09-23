# SEED-PI-05 — API: POST /layouts fixture branch

**Goal:** When `PLAN_FIXTURE_IMPORT_ENABLED` and `importMode: fixture`, call `planFixtureImport` instead of packer; persist metadata; packer fallback on empty runs (Q6).

**Depends on:** SEED-PI-04
