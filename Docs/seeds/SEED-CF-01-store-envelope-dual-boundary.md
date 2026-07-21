# SEED-CF-01 — Store envelope + dual boundary

**Change:** `layout-client-feedback` · **Status:** Pending review

## Goal
Preserve and display the full store dimensions in a distinct colour when the designer applies a smaller fixture polygon inside the store footprint.

## Scope
- Add `storeEnvelope` to layout normalize/persist (SQLite payload)
- Change `applyArea()` to save polygon without replacing envelope dimensions
- Canvas: outer store envelope (secondary colour) + inner fixture polygon (crimson)
- Meter bar: `Store W×D · Fixture zone W×D`
- OpenAPI: `StoreEnvelope`, `Layout.storeEnvelope`

## Constraints
- Backward compatible: layouts without `storeEnvelope` default to current width×depth rect
- Envelope is axis-aligned rect; fixture zone remains polygon

## Acceptance criteria
- [ ] Apply polygon inside 20×15 m store → outer 20×15 envelope visible in second colour
- [ ] Fixture polygon persists and containment rules unchanged
- [ ] Meter bar shows both store and fixture zone dimensions
- [ ] Reload layout preserves envelope and polygon

## Evidence
- Manual canvas check after Apply
- API test: envelope persisted after PATCH polygon

## Risks & rollback
- Medium: `applyArea` behaviour change; rollback by omitting envelope render and restoring AABB-only Apply

## Spec link
`openspec/changes/layout-client-feedback/specs/layouts/spec.md`
