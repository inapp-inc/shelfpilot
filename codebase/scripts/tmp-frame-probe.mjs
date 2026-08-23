/** Throwaway: run the kiosk map framing math against the live demo layout. */
import { buildStorePlanScene, faceRouteAnchor, findPlanFixture } from "../web/src/shopper/shopperStorePlan.js";
import {
  clampViewBoxToBounds,
  expandViewBoxForPoints,
  fitViewBoxToAspect,
  focusViewBoxForGuidedRoute,
  guidedStoreShare,
} from "../web/src/shopper/shopperMapFraming.js";
import { computeShopperRoute, resolveShopperEntry } from "../web/src/shopper/shopperWayfinding.js";

const API = "http://127.0.0.1:3000";

async function api(path, token) {
  const res = await fetch(`${API}${path}`, {
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
  });
  if (!res.ok) throw new Error(`${path} -> ${res.status} ${await res.text()}`);
  return res.json();
}

const login = await (
  await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ email: "kiosk.admin@shelfpilot.local", password: "KioskQa-local-only" }),
  })
).json();

const layout = await api("/layouts/lay-demo-generated?include=planograms", login.token);
const entry = resolveShopperEntry(layout, null);
const firstShelf = (layout.shelves || []).find((s) =>
  (s.faces?.some((f) => f.planogram?.length) ?? s.planogram?.length)
);
const route = computeShopperRoute(layout, entry, firstShelf.id);
const plan = buildStorePlanScene(layout, entry, []);
const hit = findPlanFixture(plan.fixtures, firstShelf.id, null);
const anchor = faceRouteAnchor(hit?.face, route[route.length - 1]);

const path = [...route, { x: anchor.x, y: anchor.y }];
const extras = [...path, { x: entry.x, y: entry.y }, anchor, { x: anchor.x, y: anchor.y - 1.2 }];
const full = expandViewBoxForPoints(plan.vb, extras);
const guided = focusViewBoxForGuidedRoute(full, path, entry, anchor, hit?.fixture?.aabb || null, {
  storeShare: guidedStoreShare(plan.span),
});
const hostAspect = 1882 / 869;
const fitted = fitViewBoxToAspect(guided, hostAspect);
const clamped = clampViewBoxToBounds(fitted, {
  minX: full.minX,
  minY: full.minY,
  maxX: full.minX + full.width,
  maxY: full.minY + full.height,
});

const show = (label, vb) =>
  console.log(
    label.padEnd(10),
    `x ${vb.minX.toFixed(2)}..${(vb.minX + vb.width).toFixed(2)}`,
    `y ${vb.minY.toFixed(2)}..${(vb.minY + vb.height).toFixed(2)}`,
    `(${vb.width.toFixed(2)} x ${vb.height.toFixed(2)}, aspect ${(vb.width / vb.height).toFixed(2)})`
  );

console.log("shelf", firstShelf.id, "span", plan.span.toFixed(2));
console.log("entry", entry.x.toFixed(2), entry.y.toFixed(2));
console.log("route", route.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" → "));
console.log("anchor", anchor);
console.log("target aabb", hit?.fixture?.aabb);
console.log("floor", plan.floor, "envelope", plan.envelope);
show("plan.vb", plan.vb);
show("full", full);
show("guided", guided);
show("fitted", fitted);
show("clamped", clamped);
