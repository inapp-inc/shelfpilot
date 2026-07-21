# Review checklist — layout-client-feedback

**Status:** Approved 2026-07-21 (defaults A applied)

Please confirm or adjust before implementation.

## Decision 1 — Store envelope colour

| Option | Description |
|--------|-------------|
| **A (recommended)** | Slate grey dashed outer envelope; crimson inner fixture polygon |
| B | Blue outer / green inner |
| C | Client brand colours (specify hex) |

**Your choice:** _pending_

## Decision 2 — Category → fixture type defaults

| Option | Description |
|--------|-------------|
| **A (recommended)** | Fresh produce / vegetable categories → `storage`; grocery → `gondola`; else `shelf`; editable in Smart Generate |
| B | Admin-config only (no Smart Generate column) |
| C | Manual palette only — no autogen type mapping |

**Your choice:** _pending_

## Decision 3 — Focus zoom scope

| Option | Description |
|--------|-------------|
| **A (recommended)** | Focus by **mapped category** + current **selection** |
| B | Categories only |
| C | Fit-to-view only (no category focus in v1) |

**Your choice:** _pending_

## Decision 4 — Polygon edit mode

| Option | Description |
|--------|-------------|
| **A (recommended)** | New **Edit area** tool: drag vertices after apply |
| B | Always-editable vertices when polygon selected |
| C | Properties panel numeric coords only (no canvas drag) |

**Your choice:** _pending_

## Decision 5 — Review API shape

| Option | Description |
|--------|-------------|
| **A (recommended)** | Dedicated `POST .../review/submit`, `/approve`, `/reject { comment }` |
| B | Single PATCH layout with status + optional comment |

**Your choice:** _pending_

## Decision 6 — “Dirty since submit” detection

| Option | Description |
|--------|-------------|
| **A (recommended)** | Server `contentRevision` counter on layout mutations |
| B | Compare `updatedAt` to last version snapshot timestamp |
| C | Client-only dirty flag (simpler, less reliable) |

**Your choice:** _pending_

## Open questions

1. Should **Approve** also require an optional comment, or comment on reject only?
2. When envelope is larger than polygon, should **Grow +2m** expand envelope or fixture zone?
3. Priority if phasing: **CF-05 → CF-04 → CF-03 → CF-07 → CF-01 → CF-02 → CF-06**.

## Approval

| Reviewer | Date | Approved |
|----------|------|----------|
| | | ☐ |
