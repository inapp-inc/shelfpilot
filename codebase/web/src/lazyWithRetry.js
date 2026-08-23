import { lazy } from "react";

const RELOAD_KEY = "shelfpilot.chunk-reload";

function isChunkLoadError(error) {
  const msg = String(error?.message || error);
  return (
    msg.includes("Failed to fetch dynamically imported module") ||
    msg.includes("Importing a module script failed") ||
    msg.includes("error loading dynamically imported module") ||
    msg.includes('MIME type of "text/html"')
  );
}

/** Lazy import that reloads once when hashed chunks 404 after a deploy (stale index.html). */
export function lazyWithRetry(factory) {
  return lazy(() =>
    factory().catch((error) => {
      if (isChunkLoadError(error) && !sessionStorage.getItem(RELOAD_KEY)) {
        sessionStorage.setItem(RELOAD_KEY, "1");
        window.location.reload();
        return new Promise(() => {});
      }
      sessionStorage.removeItem(RELOAD_KEY);
      throw error;
    })
  );
}

export function clearChunkReloadFlag() {
  sessionStorage.removeItem(RELOAD_KEY);
}
