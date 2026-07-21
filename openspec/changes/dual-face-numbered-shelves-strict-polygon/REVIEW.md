# Review guide — dual-face-numbered-shelves-strict-polygon

**Start here** before implementation.

## One-page summary

| Area | Today | After |
|------|-------|-------|
| **Drawn area** | Full rectangle canvas; polygon clip only | **Canvas = polygon zone**; exterior dimmed |
| **Overflow** | Packer skips (partial fix) | **Strict** blank outside line |
| **Shelf label** | `shelf`, `gondola` text | **Number** (`12`, `12A`, `12B`) |
| **Category** | Color only | **Number maps to category** in legend |
| **Planogram** | One side per shelf | **Face A + Face B** on gondolas |

## Documents

1. [proposal.md](./proposal.md)
2. [design.md](./design.md)
3. [AUDIT.md](./AUDIT.md)
4. [tasks.md](./tasks.md)
5. Spec deltas: `specs/planogram/`, `specs/layouts/`, `specs/ui-fidelity/`
6. [FSD_DELTA.md](./FSD_DELTA.md)

## Decisions needed

| # | Question | Default if no answer |
|---|----------|----------------------|
| 1 | Gondola = always double-sided? | Yes for gondola; shelf/rack single-sided |
| 2 | Face A/B categories: **same** or **can differ** on autogen? | Can differ when mix includes paired slots |
| 3 | Number format: `12A`/`12B` or `12-A`/`12-B`? | `12A` / `12B` |
| 4 | Canvas size = polygon AABB only (crop empty margin)? | Yes |
| 5 | Renumber on manual shelf add, or only on generate? | Only on **Generate**; manual adds get next free number |
| 6 | Approve folding recent containment code into this change? | Yes (SEED-DF-05) |

## Approve?

Reply **"approve dual-face-numbered-shelves-strict-polygon"** with any edits to decisions 1–6.
