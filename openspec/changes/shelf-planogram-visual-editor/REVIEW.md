# Review checklist — shelf-planogram-visual-editor

**Status:** Pending stakeholder review — 2026-07-24

Decisions below default to **Option A** unless you choose otherwise. Please reply with your choices (or “defaults OK”) before implementation starts.

---

## Questions for you

### Q1 — Editor surface

Where should the planogram editor open?

| Option | Description |
|--------|-------------|
| **A (recommended)** | **Modal overlay** over the layout editor — focused, dismissible, canvas stays visible dimmed |
| B | **Full-width bottom drawer** — slides up, canvas shrinks |
| C | **Replace canvas** temporarily — “Planogram mode” toggle in toolbar |

### Q2 — Products per bay

On one level, in one bay (segment), how many different products?

| Option | Description |
|--------|-------------|
| **A (recommended)** | **One SKU per bay per level** — simpler grid; use more bays or levels for variety |
| B | **Multiple SKUs per bay** — blocks sit side-by-side within segment width (needs ordering rules) |

### Q3 — Item count meaning

When you say “how much items will add here”, do you mean:

| Option | Description |
|--------|-------------|
| **A (recommended)** | **Front facings only** — units across the shelf width in that bay (current `facings` field) |
| B | Front facings **and** depth (backstock) — store/display both counts |
| C | Total unit capacity (facings × depth × vertical stack) as a single number |

### Q4 — Split interaction

How should users create horizontal splits?

| Option | Description |
|--------|-------------|
| **A (recommended)** | **Toolbar**: “Split into N equal bays” + custom width table (meters) |
| B | **Drag dividers** on the visual grid (more intuitive, more engineering) |
| C | Both toolbar and drag dividers |

### Q5 — Segment labels

Should each bay have an optional name (e.g. “Promo end”, “Bay 2”)?

| Option | Description |
|--------|-------------|
| **A (recommended)** | **Yes** — optional `label` on segment, shown in grid header |
| B | No — bays numbered only (Bay 1, Bay 2, …) |

### Q6 — Orphan placements on re-split

If user re-splits and old segment ids disappear:

| Option | Description |
|--------|-------------|
| **A (recommended)** | **Confirm + delete** orphaned placements |
| B | Confirm + **move** orphans to first bay |
| C | Block re-split until user removes affected products |

### Q7 — Fixture types

Which fixtures get **Open Planogram**?

| Option | Description |
|--------|-------------|
| **A (recommended)** | All shelf-like types: `shelf`, `rack`, `gondola`, `storage` |
| B | Only `storage` and `gondola` |
| C | All fixtures including custom future types |

### Q8 — Merchandising tab after this ships

| Option | Description |
|--------|-------------|
| **A (recommended)** | Keep Merchandising tab for **category assign + quick add**; modal for visual editing |
| B | Move all planogram actions into modal only; simplify Merchandising to category-only |

---

## Decision log (fill on approval)

| # | Decision | Choice | Reviewer | Date |
|---|----------|--------|----------|------|
| Q1 | Editor surface | **A — Modal overlay** | User | 2026-07-24 |
| Q2 | Products per bay | **A — One SKU per bay per level** | User | 2026-07-24 |
| Q3 | Item count meaning | **B — Front facings AND depth (backstock)** | User | 2026-07-24 |
| Q4 | Split interaction | **B — Drag dividers on visual grid** | User | 2026-07-24 |
| Q5 | Segment labels | A — optional label (default until answered) | | |
| Q6 | Orphan handling | A — confirm + delete (default until answered) | | |
| Q7 | Fixture types | A — all shelf-like types (default until answered) | | |
| Q8 | Merchandising tab | A — keep tab + modal (default until answered) | | |

| Reviewer | Date | Approved |
|----------|------|----------|
| User (Q1–Q4) | 2026-07-24 | Partial ☑ — pending Q5–Q8 |
