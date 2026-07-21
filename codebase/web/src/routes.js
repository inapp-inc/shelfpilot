/** Client-side URL routing (no extra dependencies), base-path aware.
 *
 * The app can be served under a subpath (e.g. /shelfpilot) in production. BASE comes from
 * Vite's `base` (import.meta.env.BASE_URL). All public paths returned by pathForModule are
 * prefixed with BASE; parseAppPath strips it before matching. */

const BASE = (import.meta.env.BASE_URL || "/").replace(/\/+$/, ""); // "" (dev) or "/shelfpilot"

export const MODULE_PATHS = {
  dashboard: "/dashboard",
  layouts: "/layouts",
  catalog: "/products",
  analytics: "/analytics",
  admin: "/admin",
};

/** Remove the deploy base prefix and normalize to a root-relative path. */
export function stripBase(pathname) {
  let raw = (pathname || "/").split("?")[0];
  if (BASE && (raw === BASE || raw.startsWith(`${BASE}/`))) {
    raw = raw.slice(BASE.length) || "/";
  }
  return raw.replace(/\/$/, "") || "/";
}

/** True when the URL points at the app root (before any module). */
export function isAppRootPath(pathname) {
  const raw = stripBase(pathname);
  return raw === "/" || raw === "";
}

/** @returns {{ module: string, layoutId: string | null }} */
export function parseAppPath(pathname) {
  const raw = stripBase(pathname);
  if (raw === "/" || raw === "/dashboard") return { module: "dashboard", layoutId: null };
  if (raw === "/layouts") return { module: "layouts", layoutId: null };
  const layoutMatch = raw.match(/^\/layouts\/([^/]+)$/);
  if (layoutMatch) return { module: "layouts", layoutId: decodeURIComponent(layoutMatch[1]) };
  if (raw === "/products" || raw === "/catalog") return { module: "catalog", layoutId: null };
  if (raw === "/analytics") return { module: "analytics", layoutId: null };
  if (raw === "/admin") return { module: "admin", layoutId: null };
  return { module: "dashboard", layoutId: null };
}

export function pathForModule(moduleId, layoutId = null) {
  const rel =
    moduleId === "layouts" && layoutId
      ? `/layouts/${encodeURIComponent(layoutId)}`
      : MODULE_PATHS[moduleId] || MODULE_PATHS.dashboard;
  return `${BASE}${rel}`;
}

export function subscribeToPath(callback) {
  const onPop = () => callback(window.location.pathname);
  window.addEventListener("popstate", onPop);
  return () => window.removeEventListener("popstate", onPop);
}

export function navigateTo(path, { replace = false } = {}) {
  // Callers pass paths from pathForModule (already base-prefixed). Guard against a bare path.
  let next = path.startsWith("/") ? path : `/${path}`;
  if (BASE && next !== BASE && !next.startsWith(`${BASE}/`)) next = `${BASE}${next}`;
  if (window.location.pathname === next) return;
  if (replace) window.history.replaceState(null, "", next);
  else window.history.pushState(null, "", next);
  window.dispatchEvent(new PopStateEvent("popstate"));
}
