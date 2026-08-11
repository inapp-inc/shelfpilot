const API = `${(import.meta.env.BASE_URL || "/").replace(/\/+$/, "")}/api`;

export async function publicApi(path, { method = "GET" } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { "content-type": "application/json" },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data.error || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return data;
}
