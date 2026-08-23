/** Strip heavy per-shelf planogram arrays from layout GET responses (Phase 3.5). */

function stripShelfPlanograms(shelf) {
  const s = { ...shelf };
  delete s.planogram;
  if (Array.isArray(s.faces)) {
    s.faces = s.faces.map((face) => {
      const next = { ...face };
      delete next.planogram;
      return next;
    });
  }
  return s;
}

export function stripPlanogramsFromLayout(layout) {
  if (!layout) return layout;
  const source = layout.shelves?.length ? layout.shelves : layout.fixtures || [];
  const shelves = source.map(stripShelfPlanograms);
  const out = { ...layout, shelves };
  if (layout.fixtures?.length) out.fixtures = shelves;
  return out;
}

export function layoutIncludesPlanograms(query = {}) {
  const raw = query.include;
  if (!raw) return false;
  const parts = String(raw)
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return parts.includes("planograms") || parts.includes("planogram");
}
