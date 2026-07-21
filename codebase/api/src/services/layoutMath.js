/** Auto-calc optimal fixture count from footprint and vertical template density. */

export function computeAutoCalc(layout, config) {
  const started = performance.now();
  const footprintSqm = Number(layout.widthMeters) * Number(layout.depthMeters);
  const avgFixtureArea =
    (config?.fixtureTemplates || []).reduce((sum, t) => sum + (t.defaultWidthMeters || 1) * (t.defaultDepthMeters || 0.6), 0) /
      Math.max((config?.fixtureTemplates || []).length, 1) || 0.72;
  // Leave ~35% for aisles/circulation
  const usable = footprintSqm * 0.65;
  const maxFixtures = Math.max(0, Math.floor(usable / avgFixtureArea));
  const ms = performance.now() - started;
  console.log(
    JSON.stringify({
      level: "info",
      message: "auto_calc",
      layoutId: layout.id,
      durationMs: Number(ms.toFixed(3)),
      maxFixtures,
      footprintSqm,
    })
  );
  return {
    maxFixtures,
    footprintSqm: Number(footprintSqm.toFixed(2)),
    calculatedAt: new Date().toISOString(),
  };
}

export function validateAisles(layout, config) {
  const min = Number(config?.minAisleWidthMeters ?? 1.2);
  const violations = [];
  for (const aisle of layout.aisles || []) {
    if (Number(aisle.widthMeters) < min) {
      const msg = `Aisle ${aisle.name || aisle.id} width ${aisle.widthMeters}m < min ${min}m`;
      aisle.violations = [msg];
      violations.push(msg);
    } else {
      aisle.violations = [];
    }
  }
  return violations;
}

/** Shoelace area (absolute) of a polygon ring of {x,y} points. */
function polygonArea(points) {
  if (!Array.isArray(points) || points.length < 3) return 0;
  let sum = 0;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    sum += Number(a.x) * Number(b.y) - Number(b.x) * Number(a.y);
  }
  return Math.abs(sum) / 2;
}

export function computeAnalytics(layout, categories) {
  const footprintSqm = Number(layout.widthMeters) * Number(layout.depthMeters);
  const polyArea = polygonArea(layout.polygon);
  const usableAreaSqm = polyArea > 0 ? polyArea : footprintSqm;
  const shelves = layout.shelves?.length ? layout.shelves : layout.fixtures || [];
  const fixtureArea = shelves.reduce(
    (s, f) =>
      s +
      Number(f.widthMeters || f.usableWidthMeters || 0) * Number(f.depthMeters || 0),
    0
  );
  const utilizationPercent = footprintSqm > 0 ? Number(((fixtureArea / footprintSqm) * 100).toFixed(1)) : 0;
  const usedPercentOfUsable = usableAreaSqm > 0 ? (fixtureArea / usableAreaSqm) * 100 : 0;
  const freeSpacePercent = Number(Math.max(0, Math.min(100, 100 - usedPercentOfUsable)).toFixed(1));

  // Facings: sum planogram facings across shelf faces, grouped by the face's category.
  const facingsByCatMap = new Map();
  let facingsTotal = 0;
  for (const shelf of shelves) {
    const faces = shelf.faces?.length
      ? shelf.faces
      : [{ categoryId: shelf.categoryId, planogram: shelf.planogram || [] }];
    for (const face of faces) {
      for (const p of face.planogram || []) {
        const n = Number(p.facings || 0);
        if (!n) continue;
        facingsTotal += n;
        const catId = p.categoryId || face.categoryId || shelf.categoryId || "unmapped";
        const cat = categories.find((c) => c.id === catId);
        const prev = facingsByCatMap.get(catId) || {
          categoryId: catId,
          categoryName: cat?.name || (catId === "unmapped" ? "Unmapped" : catId),
          facings: 0,
          color: cat?.color || face.color || shelf.color || "#A30A2A",
        };
        prev.facings += n;
        facingsByCatMap.set(catId, prev);
      }
    }
  }

  const byCat = new Map();
  for (const shelf of shelves) {
    if (!shelf.categoryId) continue;
    const cat = categories.find((c) => c.id === shelf.categoryId);
    const prev = byCat.get(shelf.categoryId) || {
      categoryId: shelf.categoryId,
      categoryName: cat?.name || shelf.categoryId,
      fixtureCount: 0,
      shelfCount: 0,
      color: shelf.color || cat?.color || "#A30A2A",
    };
    prev.fixtureCount += 1;
    prev.shelfCount += 1;
    byCat.set(shelf.categoryId, prev);
  }
  for (const m of layout.mappings || layout.shelfMappings || []) {
    if (byCat.has(m.categoryId)) continue;
    const cat = categories.find((c) => c.id === m.categoryId);
    byCat.set(m.categoryId, {
      categoryId: m.categoryId,
      categoryName: cat?.name || m.categoryId,
      fixtureCount: 1,
      shelfCount: 1,
      color: m.color || cat?.color || "#A30A2A",
    });
  }
  return {
    layoutId: layout.id,
    utilizationPercent,
    footprintSqm: Number(footprintSqm.toFixed(2)),
    usableAreaSqm: Number(usableAreaSqm.toFixed(2)),
    usedAreaSqm: Number(fixtureArea.toFixed(2)),
    freeSpacePercent,
    fixtureCount: shelves.length,
    aisleCount: (layout.aisles || []).length,
    capacity: layout.autoCalc?.maxFixtures ?? 0,
    facingsTotal,
    facingsByCategory: [...facingsByCatMap.values()].sort((a, b) => b.facings - a.facings),
    allocationByCategory: [...byCat.values()],
  };
}

export function computePortfolioAnalytics(layouts, categories, verticalFilter) {
  const filtered = verticalFilter
    ? layouts.filter((l) => l.vertical === verticalFilter)
    : layouts;
  let totalShelves = 0;
  let utilizationSum = 0;
  const mappedCategories = new Set();
  const byCat = new Map();

  for (const layout of filtered) {
    const summary = computeAnalytics(layout, categories);
    utilizationSum += summary.utilizationPercent;
    const shelves = layout.shelves?.length ? layout.shelves : layout.fixtures || [];
    totalShelves += shelves.length;
    for (const s of shelves) {
      if (s.categoryId) mappedCategories.add(s.categoryId);
    }
    for (const row of summary.allocationByCategory) {
      const prev = byCat.get(row.categoryId) || { ...row, shelfCount: 0 };
      prev.shelfCount += row.shelfCount ?? row.fixtureCount ?? 0;
      byCat.set(row.categoryId, prev);
    }
  }

  const layoutCount = filtered.length;
  return {
    layoutCount,
    totalShelves,
    mappedCategoryCount: mappedCategories.size,
    avgUtilizationPercent:
      layoutCount > 0 ? Number((utilizationSum / layoutCount).toFixed(1)) : 0,
    allocationByCategory: [...byCat.values()].sort((a, b) => b.shelfCount - a.shelfCount),
  };
}
