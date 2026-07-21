/**
 * Assign category mix proportions to generated shelves (largest-remainder method).
 */
import { applyFacesFromMix } from "./shelfFaces.js";

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

/**
 * @param {object[]} shelves
 * @param {{ categoryId: string, percent: number, temperatureZone?: string }[]} categoryMix
 * @param {{ id: string, color?: string }[]} categories
 */
export function assignCategoryMix(shelves, categoryMix, categories) {
  if (!shelves?.length || !categoryMix?.length) {
    return { shelves: shelves || [], shelfMappings: [] };
  }

  const totalPct = categoryMix.reduce((s, m) => s + Number(m.percent || 0), 0);
  const normalized =
    totalPct > 0
      ? categoryMix.map((m) => ({ ...m, percent: (Number(m.percent) / totalPct) * 100 }))
      : categoryMix;

  const counts = largestRemainderCounts(shelves.length, normalized);
  const slots = [];
  for (let i = 0; i < normalized.length; i += 1) {
    for (let j = 0; j < counts[i]; j += 1) {
      slots.push(normalized[i]);
    }
  }
  while (slots.length < shelves.length) {
    slots.push(normalized[normalized.length - 1]);
  }

  const updated = applyFacesFromMix(shelves, slots, categories);

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

  return { shelves: updated, shelfMappings };
}
