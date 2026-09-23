/**
 * Minimal in-memory fixed-window rate limiter — no new dependency (avoids the churn of adding
 * express-rate-limit for a demo-scale single-process app). Keyed by IP + route label so one
 * heavy endpoint being hammered doesn't throttle unrelated traffic.
 *
 * Not suitable for a multi-process deployment (state is per-process) — fine for this app's
 * current single-Node-process topology (see ARCHITECTURE_LOCAL.md).
 */

const buckets = new Map();

/** @param {{windowMs?: number, max?: number, label: string}} opts */
export function rateLimit({ windowMs = 60_000, max = 20, label }) {
  return function rateLimitMiddleware(req, res, next) {
    // Tests legitimately call heavy endpoints back-to-back far more than any real user would
    // in a minute; this module-level bucket state would otherwise leak across test cases.
    if (process.env.NODE_ENV === "test") return next();
    const key = `${label}:${req.ip}`;
    const now = Date.now();
    let bucket = buckets.get(key);
    if (!bucket || now >= bucket.resetAt) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }
    bucket.count += 1;
    if (bucket.count > max) {
      const retryAfterSec = Math.ceil((bucket.resetAt - now) / 1000);
      res.setHeader("Retry-After", String(retryAfterSec));
      return res.status(429).json({ error: "rate_limited", retryAfterSec });
    }
    next();
  };
}
