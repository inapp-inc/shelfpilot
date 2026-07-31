/**
 * Store layout analytics — calculation logic aligned with
 * Docs/Store_Layout_Reports_Logic_and_Visualization.md (Module M9).
 */
import { validateAisles } from "./layoutMath.js";
import { listCategoriesForLayout, resolveCategoryId, categoryDisplayName } from "./categoryTree.js";
import { computePlanogramCoverage } from "./planogramCoverage.js";

/** Shoelace area of polygon ring {x,y} points (m²). */
export function polygonArea(points) {
  if (!Array.isArray(points) || points.length < 3) return 0;
  let sum = 0;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    sum += Number(a.x) * Number(b.y) - Number(b.x) * Number(a.y);
  }
  return Math.abs(sum) / 2;
}

export function totalStoreArea(layout) {
  const poly = polygonArea(layout?.polygon);
  if (poly > 0) return poly;
  return Number(layout?.widthMeters || 0) * Number(layout?.depthMeters || 0);
}

export function shelfFootprintSqm(shelf) {
  const w = Number(shelf?.usableWidthMeters ?? shelf?.widthMeters) || 0;
  const d = Number(shelf?.depthMeters) || 0;
  return w * d;
}

export function shelfLinearMeters(shelf) {
  return Number(shelf?.usableWidthMeters ?? shelf?.widthMeters) || 0;
}

export function aisleFootprintSqm(aisle, layout) {
  const aw = Math.max(0.4, Number(aisle?.widthMeters) || 1);
  let len = Number(aisle?.lengthMeters);
  if (!Number.isFinite(len)) {
    const vertical = aisle?.orientation === "vertical";
    len = vertical
      ? Math.max(2, Number(layout?.depthMeters) || 10)
      : Math.max(2, Number(layout?.widthMeters) || 10);
  }
  return aw * len;
}

export function zoneFootprintSqm(zone) {
  return Math.max(0, Number(zone?.widthMeters) || 0) * Math.max(0, Number(zone?.depthMeters) || 0);
}

export function layoutShelves(layout) {
  return layout?.shelves?.length ? layout.shelves : layout?.fixtures || [];
}

export function isShelfMapped(shelf) {
  if (shelf?.faces?.length) {
    return shelf.faces.some((f) => Boolean(f.categoryId));
  }
  return Boolean(shelf?.categoryId);
}

export function shelfCategoryIds(shelf) {
  const ids = new Set();
  if (shelf?.categoryId) ids.add(shelf.categoryId);
  for (const f of shelf?.faces || []) {
    if (f.categoryId) ids.add(f.categoryId);
  }
  return [...ids];
}

/** §1.1 Space utilization breakdown. */
export function computeSpaceUtilization(layout) {
  const total = totalStoreArea(layout);
  const shelves = layoutShelves(layout);
  const allocated = shelves.reduce((s, sh) => s + shelfFootprintSqm(sh), 0);
  const aisle = (layout?.aisles || []).reduce((s, a) => s + aisleFootprintSqm(a, layout), 0);
  const blocked = (layout?.zones || []).reduce((s, z) => s + zoneFootprintSqm(z), 0);
  const unused = Math.max(0, total - allocated - aisle - blocked);
  const utilizationPercent = total > 0 ? Number(((allocated / total) * 100).toFixed(1)) : 0;
  return {
    totalStoreAreaSqm: Number(total.toFixed(2)),
    allocatedAreaSqm: Number(allocated.toFixed(2)),
    aisleAreaSqm: Number(aisle.toFixed(2)),
    blockedZoneAreaSqm: Number(blocked.toFixed(2)),
    unusedAreaSqm: Number(unused.toFixed(2)),
    utilizationPercent,
    breakdown: [
      { key: "allocated", label: "Allocated (fixtures)", areaSqm: Number(allocated.toFixed(2)), color: "#A30A2A" },
      { key: "aisle", label: "Aisles", areaSqm: Number(aisle.toFixed(2)), color: "#64748b" },
      { key: "blocked", label: "Special zones", areaSqm: Number(blocked.toFixed(2)), color: "#8b5cf6" },
      { key: "unused", label: "Unused / free", areaSqm: Number(unused.toFixed(2)), color: "#e5e7eb" },
    ],
  };
}

/** §1.2 Fixture density. */
export function computeFixtureDensity(layout) {
  const total = totalStoreArea(layout);
  const shelves = layoutShelves(layout);
  const count = shelves.length;
  const density = total > 0 ? Number((count / total).toFixed(3)) : 0;
  return {
    fixtureCount: count,
    fixturesPerSqm: density,
    fixturesPer100Sqm: Number((density * 100).toFixed(1)),
  };
}

/** §1.2 Fixture density by zone (layout zones + default store floor). */
export function computeFixtureDensityByZone(layout) {
  const shelves = layoutShelves(layout);
  const zones = layout?.zones?.length
    ? layout.zones.map((z) => ({
        zoneId: z.id,
        label: z.label || z.name || z.id,
        areaSqm: zoneFootprintSqm(z),
      }))
    : [{ zoneId: "store", label: "Store floor", areaSqm: totalStoreArea(layout) }];

  const rows = zones.map((zone) => {
    const inZone = shelves.filter((s) => {
      if (!layout?.zones?.length) return true;
      const sx = Number(s.x) || 0;
      const sy = Number(s.y) || 0;
      const z = layout.zones.find((zz) => zz.id === zone.zoneId);
      if (!z) return false;
      const zx = Number(z.x) || 0;
      const zy = Number(z.y) || 0;
      const zw = Number(z.widthMeters) || 0;
      const zd = Number(z.depthMeters) || 0;
      return sx >= zx && sx <= zx + zw && sy >= zy && sy <= zy + zd;
    });
    const area = zone.areaSqm || totalStoreArea(layout);
    const count = inZone.length;
    const density = area > 0 ? Number((count / area).toFixed(3)) : 0;
    return {
      zoneId: zone.zoneId,
      label: zone.label,
      fixtureCount: count,
      areaSqm: Number(area.toFixed(2)),
      fixturesPer100Sqm: Number((density * 100).toFixed(1)),
    };
  });

  return { rows, storeAverage: computeFixtureDensity(layout).fixturesPer100Sqm };
}

/** §1.3 Unallocated / empty shelf report. */
export function computeUnmappedShelves(layout) {
  const shelves = layoutShelves(layout);
  let totalShelfArea = 0;
  let emptyArea = 0;
  const unmapped = [];
  for (const shelf of shelves) {
    const area = shelfFootprintSqm(shelf);
    totalShelfArea += area;
    if (!isShelfMapped(shelf)) {
      emptyArea += area;
      unmapped.push({
        shelfId: shelf.id,
        label: shelf.label || shelf.displayNumber || shelf.id,
        areaSqm: Number(area.toFixed(2)),
        x: shelf.x,
        y: shelf.y,
      });
    }
  }
  const emptyPercent = totalShelfArea > 0 ? Number(((emptyArea / totalShelfArea) * 100).toFixed(1)) : 0;
  return {
    totalShelfAreaSqm: Number(totalShelfArea.toFixed(2)),
    emptyShelfAreaSqm: Number(emptyArea.toFixed(2)),
    emptyShelfPercent: emptyPercent,
    unmappedShelves: unmapped,
  };
}

/** §1.4 Vertical space utilization by level index. */
export function computeVerticalSpaceUtilization(layout) {
  const shelves = layoutShelves(layout);
  const byLevel = new Map();

  for (const shelf of shelves) {
    const levels = shelf.levels?.length
      ? shelf.levels
      : [{ levelIndex: 0 }, { levelIndex: 1 }];
    const footprint = shelfFootprintSqm(shelf);
    const levelArea = footprint / Math.max(levels.length, 1);

    for (const lv of levels) {
      const idx = Number(lv.levelIndex) || 0;
      const hasProducts = (shelf.faces || [{ planogram: shelf.planogram }]).some((face) =>
        (face.planogram || []).some((p) => Number(p.levelIndex) === idx)
      );
      const mapped = isShelfMapped(shelf);
      const utilized = hasProducts || mapped;
      const prev = byLevel.get(idx) || { levelIndex: idx, totalAreaSqm: 0, utilizedAreaSqm: 0, fixtureCount: 0 };
      prev.totalAreaSqm += levelArea;
      if (utilized) prev.utilizedAreaSqm += levelArea;
      prev.fixtureCount += 1;
      byLevel.set(idx, prev);
    }
  }

  const levels = [...byLevel.values()]
    .sort((a, b) => a.levelIndex - b.levelIndex)
    .map((row) => ({
      ...row,
      totalAreaSqm: Number(row.totalAreaSqm.toFixed(2)),
      utilizedAreaSqm: Number(row.utilizedAreaSqm.toFixed(2)),
      utilizationPercent:
        row.totalAreaSqm > 0
          ? Number(((row.utilizedAreaSqm / row.totalAreaSqm) * 100).toFixed(1))
          : 0,
      levelLabel:
        row.levelIndex === 0 ? "Bottom" : row.levelIndex === 1 ? "Eye-level" : `Level ${row.levelIndex}`,
    }));

  return { levels };
}

/** §2.1 Auto-calculated vs actual capacity. */
export function computeCapacityVariance(layout) {
  const theoretical = Number(layout?.autoCalc?.maxFixtures) || 0;
  const actual = layoutShelves(layout).length;
  const variancePercent =
    theoretical > 0 ? Number((((actual - theoretical) / theoretical) * 100).toFixed(1)) : null;
  return {
    theoreticalMaxFixtures: theoretical,
    actualFixtureCount: actual,
    variancePercent,
    nearOptimal: variancePercent != null && Math.abs(variancePercent) <= 15,
  };
}

/** §2.2 Fixture mix by type. */
export function computeFixtureMix(layout) {
  const shelves = layoutShelves(layout);
  const byType = new Map();
  let totalArea = 0;
  for (const shelf of shelves) {
    const type = shelf.type || "shelf";
    const area = shelfFootprintSqm(shelf);
    totalArea += area;
    const prev = byType.get(type) || { type, count: 0, areaSqm: 0 };
    prev.count += 1;
    prev.areaSqm += area;
    byType.set(type, prev);
  }
  const total = shelves.length;
  return [...byType.values()].map((row) => ({
    type: row.type,
    count: row.count,
    countPercent: total > 0 ? Number(((row.count / total) * 100).toFixed(1)) : 0,
    areaSqm: Number(row.areaSqm.toFixed(2)),
    areaSharePercent: totalArea > 0 ? Number(((row.areaSqm / totalArea) * 100).toFixed(1)) : 0,
  }));
}

/** §3.1 Category space allocation (area + linear). */
export function computeCategorySpaceAllocation(layout, categories) {
  const shelves = layoutShelves(layout);
  const byCat = new Map();
  let totalMappedArea = 0;
  let totalLinearM = 0;

  for (const shelf of shelves) {
    const area = shelfFootprintSqm(shelf);
    const linear = shelfLinearMeters(shelf);
    const catIds = shelfCategoryIds(shelf);
    if (!catIds.length) continue;
    const share = 1 / catIds.length;
    for (const rawCatId of catIds) {
      const resolved = resolveCategoryId(rawCatId, categories);
      const key = resolved || rawCatId;
      const cat = categories.find((c) => c.id === resolved);
      const prev = byCat.get(key) || {
        categoryId: key,
        categoryName: categoryDisplayName(rawCatId, categories),
        color: cat?.color || shelf.color || "#A30A2A",
        areaSqm: 0,
        linearMeters: 0,
        shelfCount: 0,
      };
      prev.areaSqm += area * share;
      prev.linearMeters += linear * share;
      prev.shelfCount += share;
      byCat.set(key, prev);
      totalMappedArea += area * share;
      totalLinearM += linear * share;
    }
  }

  const rows = [...byCat.values()]
    .map((row) => ({
      ...row,
      areaSqm: Number(row.areaSqm.toFixed(2)),
      linearMeters: Number(row.linearMeters.toFixed(2)),
      shelfCount: Math.round(row.shelfCount),
      areaSharePercent:
        totalMappedArea > 0 ? Number(((row.areaSqm / totalMappedArea) * 100).toFixed(1)) : 0,
      linearSharePercent:
        totalLinearM > 0 ? Number(((row.linearMeters / totalLinearM) * 100).toFixed(1)) : 0,
    }))
    .sort((a, b) => b.areaSqm - a.areaSqm);

  return { rows, totalMappedAreaSqm: Number(totalMappedArea.toFixed(2)), totalLinearMeters: Number(totalLinearM.toFixed(2)) };
}

function shelfCenter(shelf) {
  return {
    x: (Number(shelf.x) || 0) + (Number(shelf.usableWidthMeters ?? shelf.widthMeters) || 0) / 2,
    y: (Number(shelf.y) || 0) + (Number(shelf.depthMeters) || 0) / 2,
  };
}

/** §3.4 Category adjacency matrix. */
export function computeCategoryAdjacency(layout, categories) {
  const shelves = layoutShelves(layout).filter((s) => isShelfMapped(s));
  const catIds = new Set();
  for (const s of shelves) {
    for (const id of shelfCategoryIds(s)) catIds.add(resolveCategoryId(id, categories) || id);
  }
  const ids = [...catIds].sort();
  const threshold = 2.5;
  const pairs = [];

  for (let i = 0; i < shelves.length; i += 1) {
    for (let j = i + 1; j < shelves.length; j += 1) {
      const a = shelves[i];
      const b = shelves[j];
      const ca = shelfCenter(a);
      const cb = shelfCenter(b);
      const dist = Math.hypot(ca.x - cb.x, ca.y - cb.y);
      if (dist > threshold) continue;
      const catsA = shelfCategoryIds(a).map((id) => resolveCategoryId(id, categories) || id);
      const catsB = shelfCategoryIds(b).map((id) => resolveCategoryId(id, categories) || id);
      for (const c1 of catsA) {
        for (const c2 of catsB) {
          if (c1 === c2) continue;
          pairs.push({
            categoryA: c1,
            categoryB: c2,
            shelfA: a.id,
            shelfB: b.id,
            distanceMeters: Number(dist.toFixed(2)),
          });
        }
      }
    }
  }

  const matrix = ids.map((rowId) => ({
    categoryId: rowId,
    categoryName: categoryDisplayName(rowId, categories),
    cells: ids.map((colId) => {
      if (rowId === colId) return { categoryId: colId, adjacent: false, count: 0 };
      const count = pairs.filter(
        (p) =>
          (p.categoryA === rowId && p.categoryB === colId) ||
          (p.categoryA === colId && p.categoryB === rowId)
      ).length;
      return { categoryId: colId, adjacent: count > 0, count };
    }),
  }));

  return { categories: ids, matrix, adjacentPairs: pairs.length, pairs: pairs.slice(0, 20) };
}

/** §4.2 Walkability / flow (entry connectivity heuristic). */
export function computeWalkability(layout) {
  const entries = layout?.entries || [];
  const aisles = layout?.aisles || [];
  const shelves = layoutShelves(layout);
  const hasEntries = entries.length > 0;
  const hasAisles = aisles.length > 0;
  const unreachable = [];

  if (hasEntries && shelves.length) {
    for (const shelf of shelves) {
      const c = shelfCenter(shelf);
      const nearestEntry = entries.reduce((best, e) => {
        const ex = Number(e.x) || 0;
        const ey = Number(e.y) || 0;
        const d = Math.hypot(c.x - ex, c.y - ey);
        return d < best.dist ? { dist: d, entry: e } : best;
      }, { dist: Infinity, entry: null });
      if (nearestEntry.dist > 25) {
        unreachable.push({
          shelfId: shelf.id,
          label: shelf.label || shelf.displayNumber || shelf.id,
          nearestEntryMeters: Number(nearestEntry.dist.toFixed(1)),
        });
      }
    }
  }

  const connected = unreachable.length === 0 && hasEntries;
  return {
    entryCount: entries.length,
    aisleCount: aisles.length,
    connected,
    unreachableZones: unreachable,
    unreachableCount: unreachable.length,
    statusLabel: !hasEntries ? "No entries configured" : connected ? "Connected" : "Unreachable zones flagged",
  };
}

/** §4.3 Regulatory compliance scorecard (adjacency-based heuristic). */
export function computeRegulatoryCompliance(layout, config, categories) {
  const adjacency = computeCategoryAdjacency(layout, categories);
  const incompatible = config?.incompatibleCategoryPairs || [];
  const rules = incompatible.length
    ? incompatible.map((pair, i) => ({
        id: `rule-${i}`,
        label: `${pair[0]} ↔ ${pair[1]} separation`,
        categoryA: pair[0],
        categoryB: pair[1],
      }))
    : [
        { id: "entries", label: "Store has entry/exit points", check: "entries" },
        { id: "aisles", label: "Minimum aisle width configured", check: "aisles" },
      ];

  const results = rules.map((rule) => {
    if (rule.check === "entries") {
      const pass = (layout?.entries || []).length > 0;
      return { ...rule, pass, detail: pass ? "Entries present" : "Add entry points" };
    }
    if (rule.check === "aisles") {
      const pass = (layout?.aisles || []).length > 0;
      return { ...rule, pass, detail: pass ? "Aisles defined" : "No aisles" };
    }
    const violation = adjacency.pairs.some(
      (p) =>
        (p.categoryA === rule.categoryA && p.categoryB === rule.categoryB) ||
        (p.categoryA === rule.categoryB && p.categoryB === rule.categoryA)
    );
    return { ...rule, pass: !violation, detail: violation ? "Adjacent violation" : "Compliant" };
  });

  const passed = results.filter((r) => r.pass).length;
  const complianceScore = results.length > 0 ? Number(((passed / results.length) * 100).toFixed(1)) : 100;
  return { complianceScore, rulesPassed: passed, rulesTotal: results.length, rules: results };
}

/** §5.3 Approval status across layouts. */
export function computeApprovalStatus(layouts) {
  const statuses = ["draft", "in_review", "approved", "rejected", "published"];
  const counts = Object.fromEntries(statuses.map((s) => [s, 0]));
  for (const l of layouts) {
    const s = l.status || "draft";
    if (counts[s] != null) counts[s] += 1;
    else counts.draft += 1;
  }
  const total = layouts.length;
  const pendingApproval = counts.in_review || 0;
  const published = counts.published || counts.approved || 0;
  return {
    counts,
    total,
    pendingApproval,
    published,
    funnel: statuses
      .filter((s) => counts[s] > 0)
      .map((s) => ({ status: s, count: counts[s], percent: total > 0 ? Number(((counts[s] / total) * 100).toFixed(1)) : 0 })),
  };
}

/** §2.4 Store capacity benchmarking (fixtures per 1000 m²). */
export function computeStoreBenchmarking(layouts, categories) {
  const rows = layouts.map((layout) => {
    const space = computeSpaceUtilization(layout);
    const density = computeFixtureDensity(layout);
    const area1000 = space.totalStoreAreaSqm / 1000;
    const index = area1000 > 0 ? Number((density.fixtureCount / area1000).toFixed(1)) : 0;
    return {
      layoutId: layout.id,
      name: layout.name || layout.id,
      vertical: layout.vertical,
      fixtureCount: density.fixtureCount,
      areaSqm: space.totalStoreAreaSqm,
      fixturesPer1000Sqm: index,
    };
  });
  rows.sort((a, b) => b.fixturesPer1000Sqm - a.fixturesPer1000Sqm);
  const values = rows.map((r) => r.fixturesPer1000Sqm);
  const peerAverage =
    values.length > 0 ? Number((values.reduce((s, v) => s + v, 0) / values.length).toFixed(1)) : 0;
  return {
    rows: rows.map((r) => ({
      ...r,
      capacityIndex: peerAverage > 0 ? Number((r.fixturesPer1000Sqm / peerAverage).toFixed(2)) : 1,
    })),
    peerAverageFixturesPer1000Sqm: peerAverage,
  };
}

/** §6.2 Rollout progress. */
export function computeRolloutProgress(layouts) {
  const approval = computeApprovalStatus(layouts);
  const complete = approval.published;
  const total = approval.total;
  const percentComplete = total > 0 ? Number(((complete / total) * 100).toFixed(1)) : 0;
  const byVertical = new Map();
  for (const l of layouts) {
    const v = l.vertical || "unknown";
    const prev = byVertical.get(v) || { vertical: v, total: 0, published: 0 };
    prev.total += 1;
    const s = l.status || "draft";
    if (s === "published" || s === "approved") prev.published += 1;
    byVertical.set(v, prev);
  }
  return {
    percentComplete,
    complete,
    total,
    byVertical: [...byVertical.values()].map((row) => ({
      ...row,
      percent: row.total > 0 ? Number(((row.published / row.total) * 100).toFixed(1)) : 0,
    })),
  };
}

/** §6.3 Vertical / format comparison. */
export function computeVerticalComparison(layouts, categories) {
  const byVertical = new Map();
  for (const layout of layouts) {
    const v = layout.vertical || "unknown";
    const report = buildLayoutAnalyticsReport(layout, categories, {}, null);
    const prev = byVertical.get(v) || {
      vertical: v,
      layoutCount: 0,
      utilizationSum: 0,
      coverageSum: 0,
      densitySum: 0,
      complianceSum: 0,
    };
    prev.layoutCount += 1;
    prev.utilizationSum += report.utilizationPercent || 0;
    prev.coverageSum += report.productCoverage?.coveragePercent || 0;
    prev.densitySum += report.fixtureDensity?.fixturesPer100Sqm || 0;
    prev.complianceSum += report.aisleCompliance?.compliancePercent || 100;
    byVertical.set(v, prev);
  }
  return [...byVertical.values()].map((row) => ({
    vertical: row.vertical,
    layoutCount: row.layoutCount,
    avgUtilizationPercent: Number((row.utilizationSum / row.layoutCount).toFixed(1)),
    avgCoveragePercent: Number((row.coverageSum / row.layoutCount).toFixed(1)),
    avgFixtureDensity: Number((row.densitySum / row.layoutCount).toFixed(1)),
    avgAisleCompliancePercent: Number((row.complianceSum / row.layoutCount).toFixed(1)),
  }));
}

/** §6.1 Layout standardization (deviation from portfolio category mix). */
export function computeLayoutStandardization(layouts, categories) {
  if (layouts.length < 2) {
    return { rows: [], portfolioMix: [] };
  }
  const mixByLayout = layouts.map((layout) => {
    const cat = computeCategorySpaceAllocation(layout, categories);
    const shares = Object.fromEntries(
      cat.rows.map((r) => [r.categoryId, r.areaSharePercent])
    );
    return { layoutId: layout.id, name: layout.name, shares };
  });
  const allCats = new Set();
  mixByLayout.forEach((m) => Object.keys(m.shares).forEach((c) => allCats.add(c)));
  const portfolioMix = [...allCats].map((catId) => {
    const vals = mixByLayout.map((m) => m.shares[catId] || 0);
    const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
    return { categoryId: catId, avgSharePercent: Number(avg.toFixed(1)) };
  });
  const rows = mixByLayout.map((m) => {
    let deviation = 0;
    for (const pm of portfolioMix) {
      deviation += Math.abs((m.shares[pm.categoryId] || 0) - pm.avgSharePercent);
    }
    return {
      layoutId: m.layoutId,
      name: m.name,
      deviationScore: Number(deviation.toFixed(1)),
    };
  });
  rows.sort((a, b) => b.deviationScore - a.deviationScore);
  return { rows, portfolioMix };
}

/** Portfolio-level analytics bundle. */
export function buildPortfolioAnalyticsReport(layouts, categories, verticalFilter = null) {
  const filtered = verticalFilter
    ? layouts.filter((l) => l.vertical === verticalFilter)
    : layouts;
  return {
    layoutCount: filtered.length,
    approvalStatus: computeApprovalStatus(filtered),
    storeBenchmarking: computeStoreBenchmarking(filtered, categories),
    rolloutProgress: computeRolloutProgress(filtered),
    verticalComparison: computeVerticalComparison(filtered, categories),
    layoutStandardization: computeLayoutStandardization(filtered, categories),
    avgUtilizationPercent:
      filtered.length > 0
        ? Number(
            (
              filtered.reduce((s, l) => s + computeSpaceUtilization(l).utilizationPercent, 0) /
              filtered.length
            ).toFixed(1)
          )
        : 0,
  };
}

/** §4.1 Aisle compliance. */
export function computeAisleCompliance(layout, config) {
  const min = Number(config?.minAisleWidthMeters ?? 1.2);
  const aisles = layout?.aisles || [];
  const rows = aisles.map((a) => {
    const width = Number(a.widthMeters) || 0;
    const compliant = width >= min;
    return {
      aisleId: a.id,
      name: a.name || a.id,
      widthMeters: width,
      minWidthMeters: min,
      compliant,
    };
  });
  const compliantCount = rows.filter((r) => r.compliant).length;
  const compliancePercent =
    rows.length > 0 ? Number(((compliantCount / rows.length) * 100).toFixed(1)) : 100;
  return {
    minAisleWidthMeters: min,
    aisleCount: rows.length,
    compliantCount,
    compliancePercent,
    aisles: rows,
    violations: validateAisles(layout, config),
  };
}

function asListCategories(categories) {
  if (typeof categories === "function") return categories;
  const list = Array.isArray(categories) ? categories : [];
  return () => list;
}

function asListProducts(listProducts) {
  if (typeof listProducts === "function") return listProducts;
  const list = Array.isArray(listProducts) ? listProducts : [];
  return () => list;
}

/** §7 Executive KPI rollup. */
export function computeExecutiveKpis(parts) {
  return {
    utilizationPercent: parts.space?.utilizationPercent ?? 0,
    categoryCoveragePercent: parts.productCoverage?.coveragePercent ?? null,
    aisleCompliancePercent: parts.aisleCompliance?.compliancePercent ?? 100,
    unmappedSpacePercent: parts.unmapped?.emptyShelfPercent ?? 0,
    productCoveragePercent: parts.productCoverage?.coveragePercent ?? null,
    fixtureCount: parts.fixtureDensity?.fixtureCount ?? 0,
    capacityVariancePercent: parts.capacity?.variancePercent ?? null,
  };
}

/** Full layout analytics report bundle. */
export function buildLayoutAnalyticsReport(layout, categories, config, listProducts) {
  const listCategoriesFn = asListCategories(categories);
  const categoryList =
    typeof categories === "function"
      ? listCategoriesForLayout(layout?.vertical || "retail", listCategoriesFn)
      : Array.isArray(categories)
        ? categories
        : [];

  const space = computeSpaceUtilization(layout);
  const fixtureDensity = computeFixtureDensity(layout);
  const fixtureDensityByZone = computeFixtureDensityByZone(layout);
  const unmapped = computeUnmappedShelves(layout);
  const verticalSpace = computeVerticalSpaceUtilization(layout);
  const capacity = computeCapacityVariance(layout);
  const fixtureMix = computeFixtureMix(layout);
  const categorySpace = computeCategorySpaceAllocation(layout, categoryList);
  const aisleCompliance = computeAisleCompliance(layout, config);
  const categoryAdjacency = computeCategoryAdjacency(layout, categoryList);
  const walkability = computeWalkability(layout);
  const regulatoryCompliance = computeRegulatoryCompliance(layout, config, categoryList);
  const productCoverage = computePlanogramCoverage(
    layout,
    listCategoriesFn,
    asListProducts(listProducts)
  );
  const executive = computeExecutiveKpis({
    space,
    unmapped,
    aisleCompliance,
    productCoverage,
    fixtureDensity,
    capacity,
  });

  const footprintSqm = Number(
    (Number(layout.widthMeters || 0) * Number(layout.depthMeters || 0)).toFixed(2)
  );
  const usedPercentOfUsable =
    space.totalStoreAreaSqm > 0
      ? (space.allocatedAreaSqm / space.totalStoreAreaSqm) * 100
      : 0;
  const freeSpacePercent = Number(Math.max(0, Math.min(100, 100 - usedPercentOfUsable)).toFixed(1));

  // Legacy allocationByCategory (shelf counts) for backward compatibility
  const allocationByCategory = categorySpace.rows.map((r) => ({
    categoryId: r.categoryId,
    categoryName: r.categoryName,
    fixtureCount: r.shelfCount,
    shelfCount: r.shelfCount,
    areaSqm: r.areaSqm,
    linearMeters: r.linearMeters,
    sharePercent: r.areaSharePercent,
    color: r.color,
  }));

  // Facings by category (legacy)
  const facingsByCatMap = new Map();
  let facingsTotal = 0;
  for (const shelf of layoutShelves(layout)) {
    const faces = shelf.faces?.length
      ? shelf.faces
      : [{ categoryId: shelf.categoryId, planogram: shelf.planogram || [] }];
    for (const face of faces) {
      for (const p of face.planogram || []) {
        const n = Number(p.facings || 0);
        if (!n) continue;
        facingsTotal += n;
        const rawCatId = p.categoryId || face.categoryId || shelf.categoryId || "unmapped";
        const resolved = rawCatId === "unmapped" ? "unmapped" : resolveCategoryId(rawCatId, categoryList);
        const key = resolved || rawCatId;
        const cat = categoryList.find((c) => c.id === resolved);
        const prev = facingsByCatMap.get(key) || {
          categoryId: key,
          categoryName:
            rawCatId === "unmapped" ? "Unmapped" : categoryDisplayName(rawCatId, categoryList),
          facings: 0,
          color: cat?.color || face.color || shelf.color || "#A30A2A",
        };
        prev.facings += n;
        facingsByCatMap.set(key, prev);
      }
    }
  }

  return {
    layoutId: layout.id,
    // Legacy fields
    utilizationPercent: space.utilizationPercent,
    footprintSqm,
    usableAreaSqm: space.totalStoreAreaSqm,
    usedAreaSqm: space.allocatedAreaSqm,
    freeSpacePercent,
    fixtureCount: fixtureDensity.fixtureCount,
    aisleCount: aisleCompliance.aisleCount,
    capacity: capacity.theoreticalMaxFixtures,
    facingsTotal,
    facingsByCategory: [...facingsByCatMap.values()].sort((a, b) => b.facings - a.facings),
    allocationByCategory,
    // M9 report sections
    spaceUtilization: space,
    fixtureDensity,
    fixtureDensityByZone,
    unmappedShelves: unmapped,
    verticalSpaceUtilization: verticalSpace,
    capacityVariance: capacity,
    fixtureMix,
    categorySpaceAllocation: categorySpace,
    categoryAdjacency,
    walkability,
    regulatoryCompliance,
    aisleCompliance,
    productCoverage,
    executiveKpis: executive,
  };
}
