import { useEffect } from "react";
import MissingProductsPanel from "./MissingProductsPanel.jsx";

/** Toolbar modal — catalog products not placed on any shelf, grouped by category. */
export default function MissingProductsDialog({
  open,
  onClose,
  coverage,
  loading,
  onRefresh,
  categories = [],
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="modal-backdrop missing-products-dialog-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="missing-products-dialog-title"
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className="modal missing-products-modal" onMouseDown={(e) => e.stopPropagation()}>
        <header className="missing-products-modal-head">
          <div>
            <h2 id="missing-products-dialog-title" style={{ margin: 0, fontSize: 18 }}>
              Missing products
            </h2>
            <p className="muted" style={{ fontSize: 13, margin: "6px 0 0" }}>
              Catalog SKUs not placed on any shelf — open a shelf planogram to drag them onto levels
            </p>
          </div>
          <button type="button" className="btn-secondary missing-products-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <MissingProductsPanel
          coverage={coverage}
          loading={loading}
          onRefresh={onRefresh}
          categories={categories}
          alwaysShow
          embedded
          maxProductsPerCategory={null}
        />

        <div className="modal-actions">
          {onRefresh ? (
            <button type="button" className="btn-secondary" onClick={onRefresh} disabled={loading}>
              {loading ? "Refreshing…" : "Refresh"}
            </button>
          ) : null}
          <button type="button" className="btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
