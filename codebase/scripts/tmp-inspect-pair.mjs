/** Throwaway: print one gondola pair's geometry from the demo layout. */
const API = "http://localhost:3000";

const login = await fetch(`${API}/auth/login`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    email: "kiosk.qa.admin@shelfpilot.local",
    password: process.env.QA_ADMIN_PASSWORD,
  }),
}).then((r) => r.json());

const layout = await fetch(`${API}/layouts/lay-demo-generated`, {
  headers: { authorization: `Bearer ${login.token}` },
}).then((r) => r.json());

const shelves = layout.shelves || layout.layout?.shelves || [];
console.log("shelves:", shelves.length, "aisles:", (layout.aisles || layout.layout?.aisles || []).length);
const paired = shelves.filter((s) => s.pairId);
console.log("paired:", paired.length);
const firstPairId = paired[0]?.pairId;
for (const s of paired.filter((s) => s.pairId === firstPairId)) {
  console.log({
    id: s.id,
    pairRole: s.pairRole,
    x: s.x,
    y: s.y,
    w: s.widthMeters,
    usableW: s.usableWidthMeters,
    d: s.depthMeters,
    rot: s.rotationDeg,
    aisleId: s.aisleId,
    idx: s.shelfIndexAlongAisle,
  });
}
const a = (layout.aisles || [])[0];
console.log("aisle0:", { id: a?.id, x: a?.x, y: a?.y, w: a?.widthMeters, len: a?.lengthMeters, o: a?.orientation });
