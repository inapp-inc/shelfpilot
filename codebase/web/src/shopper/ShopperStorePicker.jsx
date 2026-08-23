import { useMemo, useState } from "react";
import { STORE_TYPES } from "../storeTypes.js";

function storeGroupLabel(vertical) {
  if (vertical === "warehouse") return "Warehouses";
  return "Retail stores";
}

/** Full-screen store picker when a customer has more than one permitted location (FR-KIOSK-01). */
export default function ShopperStorePicker({ stores = [], activeId, onSelect, onClose, userName = "" }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");

  const grouped = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = stores.filter((s) => {
      if (filter === "retail" && s.vertical === "warehouse") return false;
      if (filter === "warehouse" && s.vertical !== "warehouse") return false;
      if (!q) return true;
      return (
        String(s.name || "")
          .toLowerCase()
          .includes(q) ||
        String(s.vertical || "")
          .toLowerCase()
          .includes(q)
      );
    });
    const retail = filtered.filter((s) => s.vertical !== "warehouse");
    const warehouse = filtered.filter((s) => s.vertical === "warehouse");
    return [
      { key: "retail", label: storeGroupLabel("retail"), items: retail },
      { key: "warehouse", label: storeGroupLabel("warehouse"), items: warehouse },
    ].filter((g) => g.items.length);
  }, [stores, query, filter]);

  return (
    <div className="sp-kiosk-picker-backdrop" role="dialog" aria-modal="true" aria-label="Choose a store">
      <div className="sp-kiosk-picker">
        <header className="sp-kiosk-picker-head">
          <div>
            <h2>Choose your store</h2>
            {userName ? <p className="sp-kiosk-muted">Signed in as {userName}</p> : null}
          </div>
          {onClose ? (
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
          ) : null}
        </header>

        <div className="sp-kiosk-picker-toolbar">
          <input
            type="search"
            className="sp-kiosk-picker-search"
            placeholder="Search stores…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <div className="sp-kiosk-picker-filters" role="tablist" aria-label="Store type">
            {[
              { id: "all", label: "All" },
              { id: "retail", label: "Retail" },
              { id: "warehouse", label: "Warehouse" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                className={`sp-kiosk-picker-filter${filter === tab.id ? " is-active" : ""}`}
                aria-selected={filter === tab.id}
                onClick={() => setFilter(tab.id)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="sp-kiosk-picker-groups">
          {grouped.length ? (
            grouped.map((group) => (
              <section key={group.key} className="sp-kiosk-picker-group">
                <h3>{group.label}</h3>
                <ul className="sp-kiosk-picker-list">
                  {group.items.map((store) => {
                    const type = STORE_TYPES.find((t) => t.vertical === store.vertical);
                    return (
                      <li key={store.id}>
                        <button
                          type="button"
                          className={`sp-kiosk-picker-item${store.id === activeId ? " is-active" : ""}`}
                          onClick={() => onSelect(store.id)}
                        >
                          <span className="sp-kiosk-picker-item-name">{store.name}</span>
                          <span className="sp-kiosk-picker-item-meta">
                            {type?.label || store.vertical || "Store"}
                            {store.status ? ` · ${store.status}` : ""}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))
          ) : (
            <p className="sp-kiosk-muted">No stores match your search.</p>
          )}
        </div>
      </div>
    </div>
  );
}
