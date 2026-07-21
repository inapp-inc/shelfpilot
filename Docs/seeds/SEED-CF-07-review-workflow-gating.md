# SEED-CF-07 — Review workflow + button gating

**Change:** `layout-client-feedback` · **Status:** Pending review

## Goal
Require rejection comments, hide Submit after submit until changes, and hide Approve/Reject until a layout awaits review.

## Scope
- Layout fields: `reviewComment`, `reviewedAt`, `reviewedBy`, `contentRevision`, `submittedRevision` (or equivalent)
- Endpoints: `POST .../review/submit`, `/approve`, `/reject { comment }`
- Reject modal requires non-empty comment
- Designer banner when status `rejected` showing comment
- Button gating in LayoutEditor header:
  - Submit: hidden when `in_review`/`approved` unless dirty since submit
  - Approve/Reject: only when `in_review`
- OpenAPI + audit log entries

## Constraints
- Existing RBAC (Designer vs Approver) unchanged
- Sanitize review comments (no HTML injection)

## Acceptance criteria
- [ ] Reject without comment → blocked
- [ ] Rejected layout shows comment to designer
- [ ] Submit hidden after submit until shelf/polygon/mapping edit
- [ ] Approve/Reject hidden after approval until new submission
- [ ] `contentRevision` increments on layout mutations

## Evidence
- API tests: reject comment required, gating rules
- Manual workflow: submit → approve → edit → resubmit

## Risks & rollback
- Medium: workflow state machine; rollback by restoring always-visible buttons and optional comment

## Spec link
`openspec/changes/layout-client-feedback/specs/layouts/spec.md`
