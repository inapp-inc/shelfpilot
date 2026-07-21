/**
 * Smoke demo against a running API (default http://127.0.0.1:3000).
 * Usage: node scripts/smoke-demo.mjs [baseUrl]
 */
const base = process.argv[2] || process.env.SMOKE_BASE || "http://127.0.0.1:3000";

async function req(path, opts = {}) {
  const res = await fetch(`${base}${path}`, {
    ...opts,
    headers: {
      "content-type": "application/json",
      ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}),
      ...(opts.headers || {}),
    },
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = { raw: text };
  }
  if (!res.ok) {
    throw new Error(`${opts.method || "GET"} ${path} -> ${res.status} ${JSON.stringify(json)}`);
  }
  return { res, json };
}

async function main() {
  await req("/health");
  const { json: login } = await req("/auth/login", {
    method: "POST",
    body: { email: "designer@shelfpilot.local", password: "password", role: "Designer" },
  });
  const token = login.token;
  const { json: created } = await req("/layouts", {
    method: "POST",
    token,
    body: { name: `Smoke ${Date.now()}`, vertical: "retail", widthMeters: 12, depthMeters: 8 },
  });
  await req(`/layouts/${created.id}/fixtures`, {
    method: "POST",
    token,
    body: { type: "shelf", widthMeters: 1.2, depthMeters: 0.6, x: 1, y: 1 },
  });
  await req(`/layouts/${created.id}/aisles`, {
    method: "POST",
    token,
    body: { name: "A", widthMeters: 1.5 },
  });
  const layout = (
    await req(`/layouts/${created.id}`, { token })
  ).json;
  const fixtureId = layout.fixtures[0].id;
  await req(`/layouts/${created.id}/mappings`, {
    method: "POST",
    token,
    body: { fixtureId, categoryId: "electronics", color: "#3b82f6" },
  });
  await req(`/analytics/layouts/${created.id}/summary`, { token });
  console.log("smoke-demo PASS —", base);
}

main().catch((err) => {
  console.error("smoke-demo FAIL —", err.message || err);
  process.exit(1);
});
