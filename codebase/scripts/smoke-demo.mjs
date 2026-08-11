/**
 * Smoke demo against a running API (default http://127.0.0.1:3000).
 * Usage: node scripts/smoke-demo.mjs [baseUrl]
 *
 * Happy path: create → Smart Generate → arrangement summary → accept → analytics.
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
    body: { name: `Smoke ${Date.now()}`, vertical: "retail", widthMeters: 24, depthMeters: 16 },
  });

  const { json: generated } = await req(`/layouts/${created.id}/autogenerate`, {
    method: "POST",
    token,
    body: {
      orientation: "horizontal",
      replaceExisting: true,
      minAisleWidthMeters: 1.5,
      fillPlanogram: false,
    },
  });
  const shelfCount = (generated.shelves || []).length;
  if (!shelfCount) {
    throw new Error("autogenerate produced no shelves");
  }

  const { json: summary } = await req(`/layouts/${created.id}/arrangement-summary`, { token });
  if (!(summary?.arrangement?.totalShelves > 0)) {
    throw new Error("arrangement-summary missing shelf metrics");
  }
  if (summary.accepted) {
    throw new Error("expected arrangement not yet accepted after generate");
  }

  const blocked = await fetch(`${base}/layouts/${created.id}/shelves/${generated.shelves[0].id}/planogram`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ productId: "p1", levelIndex: 0, facings: 1 }),
  });
  if (blocked.status !== 409) {
    const body = await blocked.text();
    throw new Error(`expected planogram 409 before accept, got ${blocked.status} ${body}`);
  }

  await req(`/layouts/${created.id}/arrangement/accept`, {
    method: "POST",
    token,
    body: { fillPlanogram: false },
  });

  const { json: after } = await req(`/layouts/${created.id}/arrangement-summary`, { token });
  if (!after.accepted) {
    throw new Error("arrangement still not accepted after accept");
  }

  await req(`/analytics/layouts/${created.id}/summary`, { token });
  console.log("smoke-demo PASS —", base, `· ${shelfCount} shelves · arrangement accepted`);
}

main().catch((err) => {
  console.error("smoke-demo FAIL —", err.message || err);
  process.exit(1);
});
