/**
 * FR-KIOSK-01 / SEED-CB-05 — explicit multi-store grants for Customer kiosk users.
 */
import { repo } from "../store/sqlite.js";

const DEMO_LAYOUT_MARKERS = ["Demo Hypermarket", "demo-generated"];

function isDemoReadyLayout(name) {
  const n = String(name || "").toLowerCase();
  return DEMO_LAYOUT_MARKERS.some((m) => n.includes(m.toLowerCase()));
}

export function isMultiStoreEnabled() {
  const v = process.env.KIOSK_MULTI_STORE;
  if (v == null || v === "") return true;
  return v === "1" || String(v).toLowerCase() === "true";
}

function layoutToStoreSummary(layout) {
  return {
    id: layout.id,
    name: layout.name,
    vertical: layout.vertical,
    status: layout.status,
  };
}

function approvedBrowsableLayouts() {
  return repo
    .listLayouts(null)
    .filter((l) => l.status === "approved" || isDemoReadyLayout(l.name))
    .map(layoutToStoreSummary);
}

function userDefaultLayoutId(user) {
  return user?.shopperLayoutId || user?.shopper_layout_id || null;
}

function userAllApproved(user) {
  return Boolean(user?.kioskAllApproved || user?.kiosk_all_approved);
}

/** Layout ids a Customer may open in the kiosk or read via GET /layouts/:id. */
export function permittedLayoutIdsFor(user) {
  if (!user || user.role !== "Customer") return null;

  const defaultId = userDefaultLayoutId(user);

  if (!isMultiStoreEnabled()) {
    return defaultId ? [defaultId] : [];
  }

  const explicit = repo.listStoreAccess(user.id);
  const ids = new Set(explicit);
  if (defaultId) ids.add(defaultId);

  if (userAllApproved(user)) {
    for (const store of approvedBrowsableLayouts()) ids.add(store.id);
  }

  if (explicit.length === 0 && !userAllApproved(user) && defaultId) {
    return [defaultId];
  }

  if (explicit.length === 0 && !userAllApproved(user) && !defaultId) {
    return [];
  }

  return [...ids];
}

export function permittedStoresFor(user) {
  const ids = permittedLayoutIdsFor(user);
  if (!ids?.length) return [];
  const byId = new Map(repo.listLayouts(null).map((l) => [l.id, l]));
  return ids
    .map((id) => byId.get(id))
    .filter(Boolean)
    .map(layoutToStoreSummary)
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function customerMayAccessLayout(user, layoutId) {
  if (!user || user.role !== "Customer") return true;
  return permittedLayoutIdsFor(user).includes(layoutId);
}

/** Pick the active store for kiosk bootstrap. Returns null when an explicit request is denied. */
export function resolveDefaultStoreId(user, requestedLayoutId = null) {
  const stores = permittedStoresFor(user);
  if (!stores.length) return null;
  const ids = new Set(stores.map((s) => s.id));
  if (requestedLayoutId) return ids.has(requestedLayoutId) ? requestedLayoutId : null;
  const defaultId = userDefaultLayoutId(user);
  if (defaultId && ids.has(defaultId)) return defaultId;
  return stores[0].id;
}
