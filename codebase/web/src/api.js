// All backend calls are namespaced under <base>/api so client routes (/layouts, /products,
// /analytics, /admin) don't collide with API endpoints and survive a page refresh.
// BASE_URL comes from Vite's `base` (e.g. "/shelfpilot/" in production, "/" in dev), so the
// API base tracks the deploy subpath automatically — no hardcoded host or path.
const API = `${(import.meta.env.BASE_URL || "/").replace(/\/+$/, "")}/api`;

export async function api(path, { token, method = "GET", body } = {}) {
  const headers = { "content-type": "application/json" };
  if (token) headers.authorization = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}
