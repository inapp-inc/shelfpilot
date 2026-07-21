# SEED-LD-01 — Dimension overlays (aisles + shelves)

**Change:** `layout-dimensions-rotation-shelf-bays` · **Status:** Pending review

## Goal
Make aisle space and shelf physical dimensions visible on the 2D canvas and selection bar.

## Scope
- Aisle secondary label: `{runLength}×{width} m` on every walkway
- Selected shelf dimension chip: `{usableW}×{depth} m`
- Selection bar dimension strings for aisle/shelf
- CSS: `.aisle-dim`, `.fixture-dim`

## Constraints
- Display-only; no API changes
- Must remain legible at 50–500% zoom

## Acceptance criteria
- [ ] Every aisle shows run×width on canvas without hover
- [ ] Selected shelf shows W×D on canvas and selection bar
- [ ] No overlap with number badges at 100% zoom on standard autogen layout

## Evidence
- Manual check at 100% and 300% zoom
- Optional DOM snapshot test for `.aisle-dim` presence

## Risks & rollback
- Low risk UI-only; revert CSS + label components

## Spec link
`openspec/changes/layout-dimensions-rotation-shelf-bays/specs/layouts/spec.md`
