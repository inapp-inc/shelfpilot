import assert from "node:assert/strict";
import test from "node:test";
import { packAislesAndShelves } from "../src/services/layoutPacker.js";
import { shelfFloorFootprint } from "../src/services/polygonContainment.js";

function rectLayout(w, d) {
  return {
    widthMeters: w,
    depthMeters: d,
    shape: "polygon",
    polygon: [
      { x: 0, y: 0 },
      { x: w, y: 0 },
      { x: w, y: d },
      { x: 0, y: d },
    ],
  };
}

function fixtureCoverageRatio(layout, shelves) {
  const poly = layout.polygon;
  const area =
    Math.abs(
      poly.reduce((sum, p, i) => {
        const q = poly[(i + 1) % poly.length];
        return sum + p.x * q.y - q.x * p.y;
      }, 0)
    ) / 2;
  const seen = new Set();
  let covered = 0;
  for (const s of shelves) {
    if (s.pairRole === "back") continue;
    const fp = shelfFloorFootprint(s);
    const key = `${fp.x.toFixed(2)}:${fp.y.toFixed(2)}:${fp.w.toFixed(2)}:${fp.d.toFixed(2)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    covered += fp.w * fp.d;
  }
  return covered / Math.max(area, 0.01);
}

test("horizontal rows place endcap stubs when remainder < full bay", () => {
  // Usable run 6.55m → three 1.8m bays (+gaps) leave ~0.9m for a stub/fill bay.
  const layout = rectLayout(6.75, 6.0);
  const { shelves } = packAislesAndShelves(layout, {
    orientation: "horizontal",
    minAisleWidthMeters: 1.2,
    compactMode: true,
    fillRemaining: true,
    shelfTemplate: { type: "gondola", usableWidthMeters: 1.8, depthMeters: 0.9 },
    fillTemplates: [
      { type: "gondola", defaultWidthMeters: 1.8, defaultDepthMeters: 0.9 },
      { type: "shelf", defaultWidthMeters: 1.2, defaultDepthMeters: 0.6 },
    ],
  });
  const fronts = shelves.filter((s) => s.pairRole !== "back");
  assert.ok(fronts.length >= 2, "expected fixtures");
  const stub = fronts.some((s) => Number(s.widthMeters) < 1.8 - 0.05);
  assert.ok(stub, "expected at least one shorter endcap / fill bay");
});

test("mixed orientation fills floor without half-store split waste", () => {
  const layout = rectLayout(23.1, 15.0);
  const opts = {
    minAisleWidthMeters: 1.5,
    compactMode: true,
    fillRemaining: true,
    shelfTemplate: { type: "gondola", usableWidthMeters: 1.8, depthMeters: 0.9, defaultLevels: 3 },
  };
  const horizontal = packAislesAndShelves(layout, { ...opts, orientation: "horizontal" });
  const vertical = packAislesAndShelves(layout, { ...opts, orientation: "vertical" });
  const mixed = packAislesAndShelves(layout, { ...opts, orientation: "mixed" });
  const bestPure = Math.max(horizontal.shelfCount, vertical.shelfCount);
  assert.ok(
    mixed.shelfCount >= bestPure * 0.95,
    `mixed should match best pure density (best=${bestPure} M=${mixed.shelfCount})`
  );
  assert.ok(mixed.aisles.length >= 2, "mixed keeps walk aisles");
});

test("mixed layout includes both horizontal and vertical shelf runs", () => {
  const layout = rectLayout(23.1, 15.0);
  const { shelves } = packAislesAndShelves(layout, {
    orientation: "mixed",
    mixedRandom: false,
    minAisleWidthMeters: 1.5,
    compactMode: true,
    fillRemaining: true,
    shelfTemplate: { type: "gondola", usableWidthMeters: 1.8, depthMeters: 0.9, defaultLevels: 3 },
  });
  const fronts = shelves.filter((s) => s.pairRole !== "back");
  const rots = new Set(fronts.map((s) => ((Number(s.rotationDeg) || 0) % 180 + 180) % 180));
  assert.ok(rots.has(0), "mixed should include horizontal runs");
  assert.ok(rots.has(90), "mixed should include vertical runs");
});

test("mixed layout fill reclaim improves fixture coverage vs fill disabled", () => {
  const layout = rectLayout(23.1, 15.0);
  const opts = {
    orientation: "mixed",
    minAisleWidthMeters: 1.5,
    compactMode: true,
    shelfTemplate: { type: "gondola", usableWidthMeters: 1.8, depthMeters: 0.9, defaultLevels: 3 },
    fillTemplates: [
      { type: "gondola", defaultWidthMeters: 1.8, defaultDepthMeters: 0.9, defaultLevels: 3 },
      { type: "shelf", defaultWidthMeters: 1.2, defaultDepthMeters: 0.6, defaultLevels: 2 },
      { type: "storage", defaultWidthMeters: 0.9, defaultDepthMeters: 0.6, defaultLevels: 2 },
    ],
  };
  const sparse = packAislesAndShelves(layout, { ...opts, fillRemaining: false });
  const dense = packAislesAndShelves(layout, { ...opts, fillRemaining: true });
  assert.ok(dense.shelfCount >= sparse.shelfCount, "fill pass should not reduce shelves");
  const sparseCov = fixtureCoverageRatio(layout, sparse.shelves);
  const denseCov = fixtureCoverageRatio(layout, dense.shelves);
  assert.ok(denseCov + 1e-9 >= sparseCov, "fill should not reduce coverage");
  assert.ok(denseCov > 0.22, `dense coverage too low: ${denseCov.toFixed(3)}`);
});
