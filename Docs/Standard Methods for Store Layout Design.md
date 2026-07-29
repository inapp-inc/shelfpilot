## **Standard Methods for Store Layout Design**

In practice, retail store designers typically use a **hybrid approach** — layouts are rarely drawn freehand from scratch; they're usually built from **entered measurements first, then visualized/adjusted graphically**. Common methods include:

* **CAD/Planogram software** (e.g., AutoCAD, SketchUp, or specialized retail planning tools like JDA/Blue Yonder Space Planning, Nielsen Spaceman, RELEX) — dimensions are entered numerically, and the tool generates a scaled drawing.  
* **Measurement-first, draw-second workflow** — the designer inputs store length/width/height and fixture sizes as numbers; the canvas is then auto-scaled, and fixtures are dragged/positioned visually on top of that scaled grid.  
* **Grid-based/graph-paper method** (still used in smaller or traditional setups) — the store floor is mapped onto a scaled grid (e.g., 1 square \= 1 sq. ft./meter) and fixtures are sketched to scale by hand or digitally.  
* **Fixture templates/libraries** — designers rarely draw shelving from scratch; they select pre-defined standard fixture blocks (gondolas, wall units, bins) with known dimensions and place them, rather than drawing custom shapes each time.  
* **Adjacency and flow planning first** — before exact placement, designers often map category zones and traffic flow conceptually (bubble diagrams), then convert that into precise measured layouts.  
* **Iterative what-if adjustment** — initial layout is generated from measurements, then manually adjusted on the visual canvas (drag, resize, rotate) while the system keeps track of real dimensions in the background.  
* **3D walkthroughs for validation** — once the 2D measured layout is finalized, a 3D view is generated for stakeholder review, rather than being designed directly in 3D.  
* **Compliance-driven constraints** — aisle widths, accessibility norms, and fire-safety clearances are typically pre-set as rules, and the layout tool flags violations rather than the designer manually checking them.  
* **Reuse of prior layouts/templates** — for chain retailers, a "master layout" or prototype store plan is often cloned and adjusted for a specific store's dimensions rather than designed fully from scratch each time.

**Bottom line:** The dominant industry pattern is **measurement-driven design with graphical visualization layered on top** — designers enter real-world dimensions (store, fixtures, aisles), and the software renders/scales the visual canvas accordingly, rather than designers freely drawing shapes and the system inferring measurements.

---

## ShelfPilot implementation map

How the current ShelfPilot codebase aligns with each method (see also `openspec/changes/layout-client-feedback` and related changes):

| Standard method | ShelfPilot feature |
|-----------------|-------------------|
| Measurement-first, draw-second | Layout wizard → W×D; **store envelope** + **fixture polygon** (`storeEnvelope`, `polygon`); meter bar in metres |
| CAD / scaled drawing from numbers | Auto-scaled 2D canvas; snap-to-grid; dimension overlays on fixtures |
| Grid-based canvas | Snap-to-half-metre grid; **fit to view**; wheel zoom |
| Fixture templates / libraries | Palette types: shelf, gondola, storage, rack; Smart Generate category → **fixture type** |
| Adjacency & flow planning | Zones; category mix; **Focus by category** on canvas |
| Iterative what-if adjustment | Drag/rotate fixtures; **Edit area** (vertex drag); Smart Generate replace |
| 3D walkthrough for validation | Orbit/Walk 3D after 2D layout; not primary design surface |
| Compliance-driven constraints | Min aisle width; polygon containment; overlap/containment violation styling |
| Reuse / master layouts | Layout versions; review workflow; vertical store-type templates |
| Planogram / facing (specialized tools) | Merchandising panel; visual planogram editor; **dual-face** labels (A1/A2) and **per-face bay splits** |

**Reference changes:** `layout-client-feedback`, `dual-face-numbered-shelves-strict-polygon`, `shelf-face-letter-number-labels`, `shelf-planogram-visual-editor`.
