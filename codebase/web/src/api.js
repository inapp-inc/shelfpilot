// All backend calls are namespaced under <base>/api so client routes (/layouts, /products,
// /analytics, /admin) don't collide with API endpoints and survive a page refresh.
// BASE_URL comes from Vite's `base` (e.g. "/shelfpilot/" in production, "/" in dev), so the
// API base tracks the deploy subpath automatically — no hardcoded host or path.
const API = `${(import.meta.env.BASE_URL || "/").replace(/\/+$/, "")}/api`;

/** Human-readable message for common API auth failures. */
export function apiErrorMessage(err) {
  if (!err) return "Request failed";
  if (err.status === 401 || err.message === "unauthorized") {
    return "Session expired or invalid. Sign out and sign in again as Designer or Admin.";
  }
  if (err.status === 403 || err.message === "forbidden") {
    return "Your role cannot import. Sign in as Designer or Admin.";
  }
  return err.message || "Request failed";
}

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
