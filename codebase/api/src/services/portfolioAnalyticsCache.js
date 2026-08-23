/**
 * In-memory cache for GET /analytics/portfolio (Phase 1 perf).
 * TTL defaults to 60s; invalidate on layout mutations.
 */

const DEFAULT_TTL_MS = Number(process.env.PORTFOLIO_CACHE_TTL_MS) || 60_000;

/** @type {Map<string, { expiresAt: number, payload: unknown }>} */
const store = new Map();

function cacheKey(vertical) {
  return vertical ? `v:${vertical}` : "all";
}

export function getCachedPortfolio(vertical) {
  const key = cacheKey(vertical);
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.payload;
}

export function setCachedPortfolio(vertical, payload, ttlMs = DEFAULT_TTL_MS) {
  store.set(cacheKey(vertical), {
    expiresAt: Date.now() + ttlMs,
    payload,
  });
}

export function invalidatePortfolioAnalyticsCache() {
  store.clear();
}
