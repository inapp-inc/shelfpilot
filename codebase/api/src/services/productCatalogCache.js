/**
 * In-memory cache for catalog list endpoints (products / categories).
 */

const DEFAULT_TTL_MS = Number(process.env.CATALOG_CACHE_TTL_MS) || 30_000;

/** @type {Map<string, { expiresAt: number, payload: unknown }>} */
const store = new Map();

function cacheKey(kind, vertical, categoryId) {
  const v = vertical ? String(vertical).toLowerCase() : "all";
  const c = categoryId ? String(categoryId) : "all";
  return `${kind}:${v}:${c}`;
}

export function getCachedCatalog(kind, vertical, categoryId) {
  const entry = store.get(cacheKey(kind, vertical, categoryId));
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(cacheKey(kind, vertical, categoryId));
    return null;
  }
  return entry.payload;
}

export function setCachedCatalog(kind, vertical, categoryId, payload, ttlMs = DEFAULT_TTL_MS) {
  store.set(cacheKey(kind, vertical, categoryId), {
    expiresAt: Date.now() + ttlMs,
    payload,
  });
}

export function invalidateCatalogCache() {
  store.clear();
}
