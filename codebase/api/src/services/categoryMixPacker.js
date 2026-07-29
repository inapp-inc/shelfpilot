/**
 * Assign category mix proportions to generated shelves (largest-remainder method).
 * Paired front+back gondolas count as one mix unit; legacy double-sided shelves keep Face A/B.
 */
import { applyFacesFromMix } from "./shelfFaces.js";
import { resolveCategoryId } from "./categoryTree.js";

function largestRemainderCounts(total, mix) {
  const raw = mix.map((m) => ({ ...m, exact: (total * m.percent) / 100 }));
  const counts = raw.map((m) => Math.floor(m.exact));
  let assigned = counts.reduce((a, b) => a + b, 0);
  const remainders = raw
    .map((m, i) => ({ i, frac: m.exact - counts[i] }))
    .sort((a, b) => b.frac - a.frac);
  let r = 0;
  while (assigned < total && r < remainders.length) {
    counts[remainders[r].i] += 1;
    assigned += 1;
    r += 1;
  }
  return counts;
}

function buildSlots(resolvedMix, total) {
  const counts = largestRemainderCounts(total, resolvedMix);
  const slots = [];
  for (let i = 0; i < resolvedMix.length; i += 1) {
    for (let j = 0; j < counts[i]; j += 1) {
      slots.push(resolvedMix[i]);
    }
  }
  while (slots.length < total) {
    slots.push(resolvedMix[resolvedMix.length - 1]);
  }
  return slots;
}

function buildMixUnits(shelves) {
  const units = [];
  const seenPairs = new Set();
  for (const shelf of shelves || []) {
    if (shelf.pairId) {
      if (seenPairs.has(shelf.pairId)) continue;
      seenPairs.add(shelf.pairId);
      const mate = shelves.find((s) => s.pairId === shelf.pairId && s.id !== shelf.id);
      const front = shelf.pairRole === "back" ? mate : shelf;
      const back = shelf.pairRole === "back" ? shelf : mate;
      if (front && back) {
        units.push({ type: "pair", front, back });
        continue;
      }
    }
    units.push({ type: "single", shelf });
  }
  return units;
}

function applyMixToPairedShelf(shelf, mixRow, categories) {
  const cat = categories.find((c) => c.id === mixRow.categoryId);
  return {
    ...shelf,
    categoryId: mixRow.categoryId,
    color: cat?.color || shelf.color,
    temperatureZone: mixRow.temperatureZone || shelf.temperatureZone || "ambient",
    faces: [
      {
        id: "A",
        categoryId: mixRow.categoryId,
        color: cat?.color || shelf.color,
        planogram: shelf.faces?.[0]?.planogram ?? shelf.planogram ?? [],
      },
    ],
    planogram: shelf.faces?.[0]?.planogram ?? shelf.planogram ?? [],
  };
}

function shelfMappingsFrom(updated) {
  const shelfMappings = [];
  for (const s of updated) {
    if (s.faces?.length) {
      for (const face of s.faces) {
        if (face.categoryId) {
          shelfMappings.push({
            shelfId: s.id,
            fixtureId: s.id,
            faceId: face.id,
            categoryId: face.categoryId,
            color: face.color,
          });
        }
      }
    } else if (s.categoryId) {
      shelfMappings.push({
        shelfId: s.id,
        fixtureId: s.id,
        categoryId: s.categoryId,
        color: s.color,
      });
    }
  }
  return shelfMappings;
}

function assignLegacyDoubleSided(shelves, categoryMix, categories) {
  const totalPct = categoryMix.reduce((s, m) => s + Number(m.percent || 0), 0);
  const normalized =
    totalPct > 0
      ? categoryMix.map((m) => ({ ...m, percent: (Number(m.percent) / totalPct) * 100 }))
      : categoryMix;

  const resolvedMix = normalized.map((m) => ({
    ...m,
    categoryId: resolveCategoryId(m.categoryId, categories) || m.categoryId,
  }));

  const slots = buildSlots(resolvedMix, shelves.length);
  const updated = applyFacesFromMix(shelves, slots, categories);
  return { shelves: updated, shelfMappings: shelfMappingsFrom(updated) };
}

function assignPairedUnits(shelves, categoryMix, categories) {
  const totalPct = categoryMix.reduce((s, m) => s + Number(m.percent || 0), 0);
  const normalized =
    totalPct > 0
      ? categoryMix.map((m) => ({ ...m, percent: (Number(m.percent) / totalPct) * 100 }))
      : categoryMix;

  const resolvedMix = normalized.map((m) => ({
    ...m,
    categoryId: resolveCategoryId(m.categoryId, categories) || m.categoryId,
  }));

  const units = buildMixUnits(shelves);
  const slots = buildSlots(resolvedMix, units.length);
  const byId = new Map();

  for (let u = 0; u < units.length; u += 1) {
    const mixA = slots[u];
    const mixB = slots[(u + 1) % slots.length];
    const unit = units[u];
    if (unit.type === "pair") {
      byId.set(unit.front.id, applyMixToPairedShelf(unit.front, mixA, categories));
      byId.set(unit.back.id, applyMixToPairedShelf(unit.back, mixB, categories));
    } else {
      const [single] = applyFacesFromMix([unit.shelf], [mixA], categories);
      byId.set(unit.shelf.id, single);
    }
  }

  const updated = shelves.map((s) => byId.get(s.id) || s);
  return { shelves: updated, shelfMappings: shelfMappingsFrom(updated) };
}

/**
 * @param {object[]} shelves
 * @param {{ categoryId: string, percent: number, temperatureZone?: string }[]} categoryMix
 * @param {{ id: string, color?: string }[]} categories
 */
export function assignCategoryMix(shelves, categoryMix, categories) {
  if (!shelves?.length || !categoryMix?.length) {
    return { shelves: shelves || [], shelfMappings: [] };
  }

  const hasPairs = shelves.some((s) => s.pairId);
  if (hasPairs) {
    return assignPairedUnits(shelves, categoryMix, categories);
  }
  return assignLegacyDoubleSided(shelves, categoryMix, categories);
}
