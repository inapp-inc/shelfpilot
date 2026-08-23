/** Resolve physical shelf id → map display unit id (merged gondola). */
export function mapHighlightShelfId(layout, physicalShelfId) {
  if (!physicalShelfId || !layout?.shelves) return physicalShelfId;
  const shelves = layout.shelves;
  const phys = shelves.find((s) => s.id === physicalShelfId);
  if (!phys) return physicalShelfId;

  const merged = shelves.find(
    (s) =>
      s.pairDisplay &&
      (s.id === physicalShelfId ||
        s.pairShelfIds?.front === physicalShelfId ||
        s.pairShelfIds?.back === physicalShelfId)
  );
  if (merged) return merged.id;

  if (phys.pairId && phys.pairRole === "back") {
    const front = shelves.find((s) => s.pairId === phys.pairId && s.pairRole !== "back");
    if (front) return front.id;
  }
  return physicalShelfId;
}

/** Pick the map face id when highlighting a gondola half. */
export function mapHighlightFaceShelfId(layout, physicalShelfId) {
  return physicalShelfId;
}
