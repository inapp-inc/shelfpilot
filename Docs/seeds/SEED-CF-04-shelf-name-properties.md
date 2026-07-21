# SEED-CF-04 — Shelf name in Properties panel

**Change:** `layout-client-feedback` · **Status:** Pending review

## Goal
Show an editable shelf name on the right Properties panel when a shelf is selected.

## Scope
- Properties panel shelf branch: editable name/label field
- Read-only summary: display number, type, dimensions, rotation
- PATCH `label` on blur or debounced change

## Constraints
- Reuse existing shelf `label` field if present; no duplicate name property
- Designer/Admin roles only for edit

## Acceptance criteria
- [ ] Select shelf → Properties shows editable name and `#displayNumber`
- [ ] Edit name → persists on reload
- [ ] Empty name falls back to type + number display

## Evidence
- Manual edit + reload
- Optional PATCH test for shelf label

## Risks & rollback
- Low: UI-only addition to PropertiesPanel

## Spec link
`openspec/changes/layout-client-feedback/specs/ui-fidelity/spec.md`
