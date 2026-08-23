import { useState } from "react";
import ShopperStorePicker from "./ShopperStorePicker.jsx";
import { readPinnedStoreId, writePinnedStoreId } from "./shopperStorePin.js";

/** Header store switcher with optional full-screen picker and local pin (D2). */
export default function ShopperStoreSwitcher({
  stores = [],
  activeId,
  onSelect,
  disabled,
  userId = null,
  userName = "",
}) {
  const [open, setOpen] = useState(false);
  const [pinOnSelect, setPinOnSelect] = useState(Boolean(readPinnedStoreId(userId)));

  if (!stores?.length) return null;

  const active = stores.find((s) => s.id === activeId) || stores[0];

  function choose(nextId) {
    if (pinOnSelect && userId) writePinnedStoreId(userId, nextId);
    onSelect(nextId);
    setOpen(false);
  }

  if (stores.length === 1) {
    return (
      <div className="sp-kiosk-store-current" aria-label="Current store">
        <span className="sp-kiosk-store-current-name">{active.name}</span>
      </div>
    );
  }

  return (
    <>
      <button
        type="button"
        className="sp-kiosk-store-switcher"
        disabled={disabled}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <span className="sp-kiosk-store-switcher-label">Store</span>
        <span className="sp-kiosk-store-switcher-name">{active?.name || "Choose store"}</span>
      </button>

      {open ? (
        <>
          <ShopperStorePicker
            stores={stores}
            activeId={activeId}
            onSelect={choose}
            onClose={() => setOpen(false)}
            userName={userName}
          />
          <label className="sp-kiosk-pin-row">
            <input
              type="checkbox"
              checked={pinOnSelect}
              onChange={(e) => {
                const next = e.target.checked;
                setPinOnSelect(next);
                if (!next && userId) writePinnedStoreId(userId, null);
                else if (next && userId && activeId) writePinnedStoreId(userId, activeId);
              }}
            />
            Remember this location on this screen
          </label>
        </>
      ) : null}
    </>
  );
}
