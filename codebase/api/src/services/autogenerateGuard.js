/**
 * Serialize one in-flight Smart Generate / autogenerate request at a time.
 * Additional callers receive 503 until the active run completes.
 */

const MAX_CONCURRENT = Number(process.env.AUTOGENERATE_MAX_CONCURRENT) || 1;

let active = 0;

export function tryAcquireAutogenerate() {
  if (active >= MAX_CONCURRENT) {
    return { ok: false, retryAfterMs: 5000 };
  }
  active += 1;
  return { ok: true };
}

export function releaseAutogenerate() {
  active = Math.max(0, active - 1);
}

export function autogenerateActiveCount() {
  return active;
}
