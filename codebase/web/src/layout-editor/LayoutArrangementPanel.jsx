import { useEffect, useState } from "react";
import { api } from "../api.js";
import AlertBanner from "../components/AlertBanner.jsx";
import {
  formatAreaFromSqm,
  formatVolumeBothFromCubicMeters,
  formatVolumeFromCubicMeters,
} from "../units.js";

/**
 * Layout summary dialog — arrangement, volume, capacity.
 * Opened from the editor top bar; must be accepted before planogram editing.
 */
export default function LayoutArrangementPanel({
  open,
  layoutId,
  token,
  editDisabled,
  accepted,
  onAccepted,
  onClose,
  toast,
}) {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [fillOnAccept, setFillOnAccept] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !layoutId) return undefined;
    let cancelled = false;
    setLoading(true);
    setError("");
    api(`/layouts/${layoutId}/arrangement-summary`, { token })
      .then((data) => {
        if (!cancelled) setSummary(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || "Could not load arrangement summary");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, layoutId, token, accepted]);

  useEffect(() => {
    if (!open) return undefined;
    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  async function handleAccept() {
    setAccepting(true);
    setError("");
    try {
      const updated = await api(`/layouts/${layoutId}/arrangement/accept`, {
        token,
        method: "POST",
        body: { fillPlanogram: fillOnAccept },
      });
      onAccepted?.(updated);
      toast?.(
        fillOnAccept && updated.planogramPlacements
          ? `Arrangement accepted · ${updated.planogramPlacements} products placed`
          : "Arrangement accepted — you can allocate products now",
        { type: "success" }
      );
    } catch (err) {
      setError(err.message || "Could not accept arrangement");
      toast?.(err.message || "Could not accept arrangement", { type: "error" });
    } finally {
      setAccepting(false);
    }
  }

  const arr = summary?.arrangement || {};
  const space = summary?.space || {};
  const volume = summary?.volume || {};
  const capacity = summary?.capacity || {};
  const isAccepted = Boolean(summary?.accepted || accepted);

  return (
    <div
      className="modal-backdrop arrangement-modal-backdrop"
      data-testid="arrangement-modal"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
    >
      <div
        className="modal arrangement-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="arrangement-modal-title"
        data-testid="arrangement-panel"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="arrangement-modal-header">
          <div>
            <h2 id="arrangement-modal-title" className="arrangement-modal-title">
              Layout summary
            </h2>
            <p className="muted arrangement-modal-sub">
              Shelf arrangement, volume & capacity before product allocation
            </p>
          </div>
          <button
            type="button"
            className="btn-secondary"
            data-testid="arrangement-close"
            style={{ padding: "6px 10px", fontSize: 12 }}
            onClick={onClose}
          >
            Close
          </button>
        </header>

        <div className="arrangement-modal-body">
          {loading ? (
            <div className="muted">Calculating shelf arrangement & volume…</div>
          ) : null}

          {!loading && error && !summary ? <AlertBanner variant="error">{error}</AlertBanner> : null}

          {!loading && summary ? (
            <>
              {isAccepted ? (
                <AlertBanner variant="success" data-testid="arrangement-accepted-banner">
                  Arrangement accepted
                  {summary?.arrangementAcceptedBy ? ` by ${summary.arrangementAcceptedBy}` : ""}. Product
                  allocation is unlocked.
                </AlertBanner>
              ) : (
                <AlertBanner variant="warning" data-testid="arrangement-pending-banner">
                  Accept this summary to unlock product allocation and planogram editing.
                </AlertBanner>
              )}

              <div className="arrangement-section">
                <div className="section-label">Shelf arrangement</div>
                <div className="arrangement-kpi-grid">
                  <div className="arrangement-kpi">
                    <strong data-testid="arrangement-row-count">{arr.rowCount ?? 0}</strong>
                    <span>Rows</span>
                  </div>
                  <div className="arrangement-kpi">
                    <strong data-testid="arrangement-shelves-per-row">{arr.shelvesPerRow ?? 0}</strong>
                    <span>Shelves / row</span>
                  </div>
                  <div className="arrangement-kpi">
                    <strong data-testid="arrangement-total-shelves">{arr.totalShelves ?? 0}</strong>
                    <span>Total shelves</span>
                  </div>
                  <div className="arrangement-kpi">
                    <strong>{formatAreaFromSqm(arr.remainingSpaceSqm)}</strong>
                    <span>Remaining space</span>
                  </div>
                  <div className="arrangement-kpi">
                    <strong data-testid="arrangement-fixture-util">{arr.fixtureUtilizationPercent ?? 0}%</strong>
                    <span>Fixture utilization</span>
                  </div>
                </div>
              </div>

              <div className="arrangement-section">
                <div className="section-label">Shelf volume (read-only)</div>
                <div className="arrangement-kpi-grid">
                  <div className="arrangement-kpi arrangement-kpi--wide">
                    <strong data-testid="arrangement-total-volume">
                      {formatVolumeBothFromCubicMeters(volume.totalStoreVolumeM3 ?? volume.availableVolumeM3)}
                    </strong>
                    <span>Total store shelf volume</span>
                  </div>
                  <div className="arrangement-kpi">
                    <strong>{formatVolumeFromCubicMeters(volume.availableVolumeM3)}</strong>
                    <span>Available</span>
                  </div>
                  <div className="arrangement-kpi">
                    <strong>{formatVolumeFromCubicMeters(volume.usedVolumeM3)}</strong>
                    <span>Used</span>
                  </div>
                  <div className="arrangement-kpi">
                    <strong>{formatVolumeFromCubicMeters(volume.freeVolumeM3)}</strong>
                    <span>Empty</span>
                  </div>
                  <div className="arrangement-kpi">
                    <strong>{arr.totalBays ?? 0}</strong>
                    <span>Total shelf bays</span>
                  </div>
                </div>
              </div>

              <div className="arrangement-section">
                <div className="section-label">Shelf capacity</div>
                <div className="arrangement-kpi-grid">
                  <div className="arrangement-kpi">
                    <strong data-testid="arrangement-max-qty">
                      {(capacity.maxProductQuantity ?? 0).toLocaleString()}
                    </strong>
                    <span>Max product qty (est.)</span>
                  </div>
                  <div className="arrangement-kpi">
                    <strong>{formatVolumeFromCubicMeters(capacity.usedShelfSpaceM3)}</strong>
                    <span>Used shelf space</span>
                  </div>
                  <div className="arrangement-kpi">
                    <strong>{formatVolumeFromCubicMeters(capacity.remainingShelfSpaceM3)}</strong>
                    <span>Remaining shelf space</span>
                  </div>
                  <div className="arrangement-kpi">
                    <strong data-testid="arrangement-capacity-util">
                      {capacity.capacityUtilizationPercent ?? 0}%
                    </strong>
                    <span>Capacity utilization</span>
                  </div>
                </div>
              </div>

              <div className="arrangement-section">
                <div className="section-label">Layout summary</div>
                <ul className="arrangement-summary-list" data-testid="arrangement-layout-summary">
                  <li>
                    <span>Store area</span>
                    <strong>{formatAreaFromSqm(space.storeAreaSqm)}</strong>
                  </li>
                  <li>
                    <span>Walking area</span>
                    <strong>{formatAreaFromSqm(space.walkingAreaSqm)}</strong>
                  </li>
                  <li>
                    <span>Fixture area</span>
                    <strong>{formatAreaFromSqm(space.fixtureAreaSqm)}</strong>
                  </li>
                  <li>
                    <span>Unused area</span>
                    <strong>{formatAreaFromSqm(space.unusedAreaSqm)}</strong>
                  </li>
                  <li>
                    <span>Total shelf fixtures</span>
                    <strong>{arr.totalShelves ?? 0}</strong>
                  </li>
                  <li>
                    <span>Total shelf bays</span>
                    <strong>{arr.totalBays ?? 0}</strong>
                  </li>
                  <li>
                    <span>Total shelf volume</span>
                    <strong>
                      {formatVolumeFromCubicMeters(volume.totalStoreVolumeM3 ?? volume.availableVolumeM3)}
                    </strong>
                  </li>
                  <li>
                    <span>Overall space utilization</span>
                    <strong>{space.overallUtilizationPercent ?? 0}%</strong>
                  </li>
                </ul>
              </div>
            </>
          ) : null}

          {error && summary ? (
            <div className="muted" style={{ color: "#A30A2A", fontSize: 12 }}>
              {error}
            </div>
          ) : null}
        </div>

        <footer className="arrangement-modal-footer">
          {!editDisabled && !isAccepted && summary ? (
            <>
              <div className="arrangement-modal-footer-options">
                <label className="arrangement-fill-row">
                  <input
                    type="checkbox"
                    checked={fillOnAccept}
                    onChange={(e) => setFillOnAccept(e.target.checked)}
                    data-testid="arrangement-fill-on-accept"
                  />
                  Auto-fill planogram after accept
                </label>
              </div>
              <div className="arrangement-modal-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  data-testid="arrangement-cancel"
                  disabled={accepting}
                  onClick={onClose}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-primary arrangement-accept-btn"
                  data-testid="arrangement-accept"
                  disabled={accepting || !(arr.totalShelves > 0)}
                  onClick={handleAccept}
                >
                  {accepting ? "Accepting…" : "Accept & continue"}
                </button>
              </div>
            </>
          ) : (
            <div className="arrangement-modal-actions arrangement-modal-actions--single">
              <button type="button" className="btn-primary" onClick={onClose} data-testid="arrangement-done">
                Done
              </button>
            </div>
          )}
        </footer>
      </div>
    </div>
  );
}
