# SEED-PI-01 — Parser: scale & millimetre dimensions

**Goal:** Shared pure functions for drawing scale (`Scale 1:50`), mm→m conversion, and aisle-width hints from plan text — foundation for fixture import.

**Spec:** `Docs/PLAN_IMPORT_FIXTURE_LAYOUT_SPEC.md` (FR-SCALE-01, FR-SCALE-02)  
**Out of scope:** Fixture run labels (PI-02); API/UI wiring.

**Evidence:** Unit tests in `codebase/api/test/` or shared test runner; text snippets derived from `Docs/plan/Layout2.png` (`Scale 1:50`, `1500` mm).

**Rollback:** N/A — additive module only.
