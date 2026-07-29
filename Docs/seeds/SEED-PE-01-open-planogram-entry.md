# SEED-PE-01 — Open Planogram entry + modal shell

**Change:** `shelf-planogram-visual-editor` · **Status:** Draft — pending review

## Goal
Give Designers a clear **Open Planogram** action when a shelf or storage fixture is selected, opening a focused modal editor.

## Scope
- `Open Planogram` button in Merchandising panel + Properties panel
- `PlanogramEditorModal.jsx` shell: header, face toggle, close/dismiss
- `LayoutEditor.jsx` state for `{ shelfId, faceId }`
- Read-only mode when layout is not editable

## Constraints
- Designer/Admin only (existing RBAC)
- Fixture types: shelf, rack, gondola, storage

## Acceptance criteria
- [ ] Select shelf → Open Planogram visible in Merchandising
- [ ] Modal opens with shelf # and dimensions in header
- [ ] Face A/B toggle on dual-face fixtures
- [ ] Esc / Close dismisses modal
- [ ] Read-only layout disables edit actions inside modal

## Evidence
- Manual: open/close on gondola and storage
- Web build passes

## Risks & rollback
- Low — UI-only entry; remove button + modal mount to rollback

## Spec link
`openspec/changes/shelf-planogram-visual-editor/specs/ui-fidelity/spec.md`
