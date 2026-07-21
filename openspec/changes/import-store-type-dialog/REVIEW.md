# Review guide — import-store-type-dialog

**Start here** before implementation.

## One-page summary

| Area | Today | After |
|------|-------|-------|
| **Import trigger** | Opens OS file picker directly | Opens **Import dialog** |
| **Store type** | Inferred per row; blank → **retail** | **Chosen in dialog** (default = active); blank rows → chosen type |
| **File input** | Click-to-browse only | **Drag & drop** + click-to-browse |
| **Wrong-vertical bug** | Hypermarket sheet lands in Retail | Imports into the selected store type |

## Root cause (verified)

`web/src/catalog/importExcel.js` → `resolveVertical(...)` returns `"retail"` when the
row's `storeType` is blank/unknown, so mixed or column-less sheets map to Retail.

## Documents

1. [proposal.md](./proposal.md)
2. [design.md](./design.md)
3. [AUDIT.md](./AUDIT.md)
4. [tasks.md](./tasks.md)
5. Spec delta: `specs/catalog/`

## Decisions needed

| # | Question | Default if no answer |
|---|----------|----------------------|
| 1 | Does the dialog store type **override** a valid `storeType` column, or only fill blanks? | Fill blanks/unknowns; honor explicit valid `storeType` cells |
| 2 | Accepted file types | `.xlsx`, `.xls`, `.csv` |
| 3 | Allow multiple files in one drop? | No — single file per import |
| 4 | Keep the toolbar store-type view selector as-is? | Yes (separate from import) |

## Approve?

Reply **"approve import-store-type-dialog"** (with edits to decisions 1–4) and I'll implement it.
