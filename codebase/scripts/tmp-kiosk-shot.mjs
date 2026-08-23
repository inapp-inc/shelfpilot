/** Throwaway: seed a kiosk Customer on the bootstrapped demo layout, then screenshot the kiosk. */
import { chromium } from "playwright";

const API = process.env.API_URL || "http://127.0.0.1:3000";
const WEB = process.env.WEB_URL || "http://localhost:5173";
const BOOTSTRAP_PASSWORD = process.env.SUPERADMIN_PASSWORD || "changeme";
const QA_PASSWORD = "KioskQa-local-only";
const ADMIN_EMAIL = "kiosk.admin@shelfpilot.local";
const CUSTOMER_EMAIL = "kiosk.qa@shelfpilot.local";

async function api(path, { method = "GET", token, body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  const json = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error(`${method} ${path} -> ${res.status} ${text}`);
  return json;
}

const login = (email, password) =>
  api("/auth/login", { method: "POST", body: { email, password } });

const superAdmin = await login("superadmin@shelfpilot.local", BOOTSTRAP_PASSWORD);

const { items: superUsers } = await api("/admin/users", { token: superAdmin.token });
if (!superUsers.some((u) => u.email === ADMIN_EMAIL)) {
  await api("/admin/users", {
    method: "POST",
    token: superAdmin.token,
    body: { email: ADMIN_EMAIL, name: "Kiosk QA Admin", role: "Admin", password: QA_PASSWORD },
  });
}
const admin = await login(ADMIN_EMAIL, QA_PASSWORD);

const countPlacements = (layout) =>
  (layout.shelves || []).reduce(
    (n, s) =>
      n + (s.faces?.reduce((m, f) => m + (f.planogram?.length || 0), 0) ?? s.planogram?.length ?? 0),
    0
  );

const { items: layouts } = await api("/layouts", { token: admin.token });
let target = null;
for (const summary of layouts) {
  const layout = await api(`/layouts/${summary.id}?include=planograms`, { token: admin.token });
  const placements = countPlacements(layout);
  if (placements && (!target || placements > target.placements)) target = { layout, placements };
}
if (!target) throw new Error("no layout has planogram placements to guide to");
console.log(`using layout ${target.layout.id} (${target.layout.name}) · ${target.placements} placements`);

const { items: users } = await api("/admin/users", { token: admin.token });
const existing = users.find((u) => u.email === CUSTOMER_EMAIL);
if (existing) {
  await api(`/admin/users/${existing.id}`, {
    method: "PATCH",
    token: admin.token,
    body: { shopperLayoutId: target.layout.id, password: QA_PASSWORD },
  });
} else {
  await api("/admin/users", {
    method: "POST",
    token: admin.token,
    body: {
      email: CUSTOMER_EMAIL,
      name: "Kiosk QA Shopper",
      role: "Customer",
      password: QA_PASSWORD,
      shopperLayoutId: target.layout.id,
    },
  });
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.on("console", (m) => {
  if (m.type() === "error") console.log("[browser error]", m.text());
});
page.on("pageerror", (e) => console.log("[page error]", e.message));

await page.goto(WEB, { waitUntil: "domcontentloaded" });
await page.fill('input[type="email"]', CUSTOMER_EMAIL);
await page.fill('input[type="password"]', QA_PASSWORD);
await page.click('button[type="submit"]');

await page.waitForSelector('[data-testid="shopper-kiosk"]', { timeout: 30000 });
await page.waitForTimeout(2500);
await page.screenshot({ path: "kiosk-browse.png" });

await page.click(".sp-kiosk-tile");
await page.waitForTimeout(2500);
await page.screenshot({ path: "kiosk-guided.png" });
const pinBox = await page.locator(".shopper-floor-map-pin").boundingBox();
console.log("pin box", pinBox);
console.log(
  "map geometry",
  await page.evaluate(() => {
    const svg = document.querySelector(".shopper-floor-map--plan");
    const host = document.querySelector(".shopper-floor-map-host");
    const pin = document.querySelector(".shopper-floor-map-pin");
    const way = document.querySelector(".shopper-floor-map-way");
    return {
      viewBox: svg?.getAttribute("viewBox"),
      host: host && { w: host.clientWidth, h: host.clientHeight },
      svgRect: svg && { w: svg.getBoundingClientRect().width, h: svg.getBoundingClientRect().height },
      pinTransform: pin?.getAttribute("transform"),
      wayStroke: way?.style?.strokeWidth,
      wayBox: way && way.getBoundingClientRect(),
    };
  })
);
await page.screenshot({
  path: "kiosk-crop-guided.png",
  clip: {
    x: Math.max(0, (pinBox?.x ?? 500) - 220),
    y: Math.max(0, (pinBox?.y ?? 300) - 120),
    width: 640,
    height: 360,
  },
});
console.log("saved kiosk-browse.png, kiosk-guided.png, kiosk-crop-guided.png");

await browser.close();
