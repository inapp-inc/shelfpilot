/** D2 — remember the kiosk's chosen store on this browser (localStorage). */

export function pinnedStoreKey(userId) {
  return `shelfpilot.kiosk.pinnedStore.${userId || "anon"}`;
}

export function readPinnedStoreId(userId) {
  try {
    return localStorage.getItem(pinnedStoreKey(userId)) || null;
  } catch {
    return null;
  }
}

export function writePinnedStoreId(userId, layoutId) {
  try {
    if (!layoutId) {
      localStorage.removeItem(pinnedStoreKey(userId));
      return;
    }
    localStorage.setItem(pinnedStoreKey(userId), layoutId);
  } catch {
    /* private browsing / quota */
  }
}
