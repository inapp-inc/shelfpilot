# Review checklist — demo-feedback-jul-2026

**Status:** Pending client/stakeholder review — 2026-07-29

Please confirm or adjust before implementation.

## Decision 1 — Shelf numbering scheme

| Option | Description |
|--------|-------------|
| **A (recommended)** | **Aisle-centric:** aisle 4 → **4A**, **4B**, **4C**; back face uses opposite aisle (**5A**, **5B**) |
| B | Keep letter-first **A1/A2** but fix selection mismatch only |
| C | Hybrid: show both (`4A · A1`) during transition |

**Your choice:** _pending_

## Decision 2 — WebGL 2D rollout

| Option | Description |
|--------|-------------|
| **A (recommended)** | New `FloorPlan2D` (Three.js); feature flag off until parity QA; replace default after sign-off |
| B | Big-bang: remove DOM `Canvas2D` immediately |
| C | Improve DOM canvas only (no WebGL) — lower effort, may not satisfy client |

**Your choice:** _pending_

## Decision 3 — Polygon draw in WebGL phase

| Option | Description |
|--------|-------------|
| **A (recommended)** | WebGL for view/edit fixtures; **SVG overlay** for draw/edit polygon modes (v1) |
| B | Full WebGL including polygon vertex editing |
| C | Keep entire 2D on DOM until WebGL polygon editing is ready |

**Your choice:** _pending_

## Decision 4 — Store dimension editing scope

| Option | Description |
|--------|-------------|
| **A (recommended)** | Toolbar W×D inputs + corner handles on envelope; fixture polygon separate |
| B | Toolbar inputs only (no canvas handles) |
| C | Create form only — no edit after layout open |

**Your choice:** _pending_

## Decision 5 — Hover product preview depth

| Option | Description |
|--------|-------------|
| **A (recommended)** | Tooltip: name/SKU list (max 8) + category |
| B | Thumbnail images per product |
| C | Full mini-planogram panel on hover |

**Your choice:** _pending_

## Decision 6 — Dashboard priority sections

| Option | Description |
|--------|-------------|
| **A (recommended)** | Status pipeline + featured layout + recent list + compact KPIs |
| B | Pipeline + recent only (minimal) |
| C | Keep current charts; add pipeline row only |

**Your choice:** _pending_

## Decision 7 — Autogen preview mode

| Option | Description |
|--------|-------------|
| A | **Preview before apply** (ghost fixtures, confirm to save) |
| **B (recommended)** | Apply immediately; show coverage toast + panel stats |
| C | Preview only in v2 follow-on |

**Your choice:** _pending_

## Open questions

1. Should aisle numbers follow **walk direction from entry point**, or **left-to-right on canvas** regardless of entry?
2. For shelves not bound to an aisle (manual placement), fallback label: **?A** or sequential **M1**, **M2** (manual)?
3. Is **80% product fill** an acceptable Smart Generate success threshold for demo?
4. Dashboard **featured layout**: always most recent, or user-pinned?
5. Implementation phasing: ship **DF-01 + DF-02 alignment** before next demo, WebGL in following sprint?

## Approval

| Reviewer | Date | Approved |
|----------|------|----------|
| | | ☐ |
