# Proposal: Customer feedback — layout editor, planogram & 3D (Jul 2026 demo)

**Status:** Draft — pending review  
**Source:** Customer demo feedback (2026-07-30), following layout editor UI simplification and smart-generate fixes.

## Summary

Eight customer-requested improvements focused on **clearer shelf-centric UX**, **readable 2D canvas at low zoom**, **missing-product workflow moved out of the side rail**, **drag-and-drop merchandising**, **dialog-first planogram editing** (replacing heavy side-panel dependency), and **3D navigation aligned with go-to-shelf**.

Each item is a **separate SEED unit** so work can be reviewed and implemented one at a time.

## Customer requests (traceability)

| ID | Customer ask | Problem today | Target behaviour |
|----|--------------|---------------|------------------|
| **CUF-01** | Right panel label **“Inspector”** should reflect shelf context | Collapsed rail shows generic “Inspector”; doesn’t match retail language | Rename to **“Shelf information”** (or equivalent) across panel shell, aria labels, and docs |
| **CUF-02** | After Smart Generate, zoom is very small — **shelf numbers unreadable** | Aisle/shelf badges always render regardless of zoom | **Hide shelf number labels when zoom &lt; 50%**; show again when user zooms in ≥ 50% |
| **CUF-03** | **Missing by category** list in right panel is wrong place | Coverage/missing products buried in Merch tab side rail | **Toolbar action** (beside Submit) opens a **dialog** listing missing products by category |
| **CUF-04** | **Drag missing products** onto a shelf → pick level → place with validation | Missing products are view-only; placement is form-based in side panel | Drag from missing-products dialog onto canvas shelf → **level picker dialog** → planogram POST with validations |
| **CUF-05** | **Shelf click → dialog**; side panel no longer needed for planogram | Planogram split between Merch tab + modal; side rail still primary | **Single shelf dialog** on shelf select/double-click: properties + planogram in one place; side rail optional/collapsed by default |
| **CUF-06** | **Redesign planogram** — proper layout + **drag-and-drop products** | Planogram modal is functional but not visual-first; limited DnD | Level×bay grid, draggable product blocks, segment resize, face toggle — aligned with `shelf-planogram-visual-editor` vision |
| **CUF-07** | **Go to shelf** should work in **3D view** | Go-to-shelf focuses 2D canvas + highlight; 3D camera doesn’t land on shelf | User chooses “View in 3D” (or switches to 3D) → camera **flies to selected shelf**, highlights fixture |
| **CUF-08** | **3D view needs a better overall experience** | 3D is validation-only; orbit/walk hints minimal; no shelf-centric navigation | Shelf picker in 3D, improved lighting/labels, walk entry at shelf, **planogram → full-height 3D with visible facings** (see [planogram-3d-shelf-view.md](./planogram-3d-shelf-view.md)) |

## Dependencies & suggested order

```
CUF-01 ──┐
CUF-02 ──┼── quick wins (parallel OK)
CUF-03 ──┘
    │
    ├──► CUF-04 (needs missing-products dialog from CUF-03)
    │
CUF-07 ──┼── navigation (can run before planogram)
    │
CUF-05 ──┼──► CUF-06 (dialog shell → visual planogram)
    │
CUF-08 ──┘── 3D polish (benefits from CUF-07)
```

**Recommended sequence:**  
`CUF-01` → `CUF-02` → `CUF-03` → `CUF-07` → `CUF-04` → `CUF-05` → `CUF-06` → `CUF-08`

## Out of scope (this change pack)

- Smart Generate algorithm changes (see `smart-generate-fixes-jul-2026`)
- Store Master / custom fixture types (already delivered)
- Full dashboard rework

## References

- [layout-client-feedback](../layout-client-feedback/proposal.md) — envelope, side rail, review workflow
- [shelf-planogram-visual-editor](../shelf-planogram-visual-editor/proposal.md) — visual planogram vision (CUF-05/06 extends this)
- [demo-feedback-jul-2026](../demo-feedback-jul-2026/proposal.md) — aisle-centric labels, hover, 3D highlight baseline

## Acceptance (program level)

- [ ] All eight CUF units have passing build + targeted tests where applicable
- [ ] Customer demo script updated for new missing-products dialog, shelf dialog, and 3D go-to
- [ ] No regression to 2D measured layout as source of truth
