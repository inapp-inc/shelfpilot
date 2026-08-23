import { useEffect, useState } from "react";
import { api } from "../api.js";
import LoadingState from "../components/LoadingState.jsx";

/** Admin — configure the single public shopper / kiosk layout. */
export default function AdminShopperPanel({ token, layouts = [], toast }) {
  const [form, setForm] = useState({
    enabled: false,
    layoutId: "",
    displayName: "",
    entryPointId: "",
  });
  const [saved, setSaved] = useState({
    enabled: false,
    layoutId: "",
  });
  const [entryPoints, setEntryPoints] = useState([]);
  const [layoutName, setLayoutName] = useState("");
  const [loading, setLoading] = useState(true);
  const [layoutLoading, setLayoutLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    api("/admin/shopper-experience", { token })
      .then((data) => {
        const next = {
          enabled: Boolean(data.enabled),
          layoutId: data.layoutId || "",
          displayName: data.displayName || "",
          entryPointId: data.entryPointId || "",
        };
        setForm(next);
        setSaved({ enabled: next.enabled, layoutId: next.layoutId });
        setEntryPoints(data.entryPoints || []);
        setLayoutName(data.layoutName || "");
      })
      .catch((e) => toast?.(e.message))
      .finally(() => setLoading(false));
  }, [token, toast]);

  async function onLayoutChange(layoutId) {
    setForm((f) => ({
      ...f,
      layoutId,
      entryPointId: "",
      enabled: layoutId ? true : f.enabled,
    }));
    if (!layoutId || !token) {
      setEntryPoints([]);
      setLayoutName("");
      return;
    }
    setLayoutLoading(true);
    try {
      const layout = await api(`/layouts/${layoutId}`, { token });
      setLayoutName(layout.name || layoutId);
      const points = (layout.entryPoints || []).map((e) => ({
        id: e.id,
        label: e.label || "Entrance",
      }));
      setEntryPoints(points);
      if (points.length === 1) {
        setForm((f) => ({ ...f, layoutId, entryPointId: points[0].id, enabled: true }));
      }
    } catch (e) {
      toast?.(e.message);
    } finally {
      setLayoutLoading(false);
    }
  }

  async function save() {
    if (form.enabled && !form.layoutId) {
      toast?.("Select a layout before enabling the kiosk", { type: "error" });
      return;
    }
    setSaving(true);
    try {
      const data = await api("/admin/shopper-experience", {
        token,
        method: "PUT",
        body: {
          enabled: form.enabled,
          layoutId: form.layoutId || null,
          displayName: form.displayName.trim(),
          entryPointId: form.entryPointId || null,
        },
      });
      setForm((f) => ({
        ...f,
        enabled: Boolean(data.enabled),
        layoutId: data.layoutId || "",
        displayName: data.displayName || "",
        entryPointId: data.entryPointId || "",
      }));
      setSaved({
        enabled: Boolean(data.enabled),
        layoutId: data.layoutId || "",
      });
      setEntryPoints(data.entryPoints || []);
      setLayoutName(data.layoutName || "");
      toast?.(
        data.enabled
          ? "Shopper kiosk enabled for Customer sign-in"
          : "Shopper kiosk saved (currently disabled)",
        { type: "success" }
      );
    } catch (e) {
      toast?.(e.message === "shopper_layout_required" ? "Select a layout before enabling" : e.message);
    } finally {
      setSaving(false);
    }
  }

  const kioskReady =
    saved.enabled && saved.layoutId && saved.layoutId === form.layoutId && form.enabled;

  if (loading) {
    return (
      <div className="admin-shopper-panel admin-shopper-panel--loading" data-testid="admin-shopper-panel">
        <LoadingState label="Loading shopper settings…" />
      </div>
    );
  }

  return (
    <div className="admin-shopper-panel" data-testid="admin-shopper-panel">
      <header className="admin-shopper-header">
        <h3 className="admin-shopper-title">Shopper kiosk</h3>
        <p className="admin-shopper-lead muted">
          In-store product finder for Customer accounts. Shoppers sign in — no public link or QR code.
        </p>
      </header>

      <label className={`admin-shopper-check${form.enabled ? " is-on" : ""}`}>
        <input
          type="checkbox"
          checked={form.enabled}
          onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
          data-testid="admin-shopper-enabled"
        />
        <span>
          <strong>Enable shopper wayfinding kiosk</strong>
          <span className="admin-shopper-check-hint muted">
            {form.enabled ? "Customers can use the kiosk after you save" : "Kiosk stays off until enabled"}
          </span>
        </span>
      </label>

      <div className="field">
        <label htmlFor="admin-shopper-layout">Shopper layout</label>
        <select
          id="admin-shopper-layout"
          value={form.layoutId}
          data-testid="admin-shopper-layout"
          onChange={(e) => onLayoutChange(e.target.value)}
          disabled={layoutLoading || saving}
        >
          <option value="">Select layout…</option>
          {layouts.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name} ({l.status})
            </option>
          ))}
        </select>
        {layoutLoading ? <LoadingState label="Loading layout…" size="sm" variant="inline" /> : null}
        {layoutName && !layoutLoading ? (
          <span className="muted" style={{ fontSize: 12 }}>
            Selected: {layoutName}
          </span>
        ) : null}
      </div>

      <div className="field">
        <label htmlFor="admin-shopper-display-name">Display name (optional)</label>
        <input
          id="admin-shopper-display-name"
          type="text"
          value={form.displayName}
          placeholder={layoutName || "Store name on kiosk"}
          onChange={(e) => setForm({ ...form, displayName: e.target.value })}
          data-testid="admin-shopper-display-name"
          disabled={saving}
        />
      </div>

      <div className="field">
        <label htmlFor="admin-shopper-entry">Start location (entry point)</label>
        <select
          id="admin-shopper-entry"
          value={form.entryPointId}
          disabled={!entryPoints.length || layoutLoading || saving}
          data-testid="admin-shopper-entry"
          onChange={(e) => setForm({ ...form, entryPointId: e.target.value })}
        >
          <option value="">{entryPoints.length ? "Select entrance…" : "Auto — front of store"}</option>
          {entryPoints.map((e) => (
            <option key={e.id} value={e.id}>
              {e.label}
            </option>
          ))}
        </select>
        {!entryPoints.length && form.layoutId && !layoutLoading ? (
          <span className="muted" style={{ fontSize: 11 }}>
            No door marked on the layout. The kiosk uses a front-of-store entrance space and still draws the walking line.
          </span>
        ) : null}
      </div>

      {form.layoutId ? (
        <div className={`admin-shopper-url-card${kioskReady ? " is-live" : ""}`}>
          <div className="admin-shopper-url-label">Customer access</div>
          <p className="admin-shopper-url-hint" style={{ margin: 0 }}>
            Assign this layout to Customer users under <strong>Users &amp; Roles</strong>. They can sign in
            immediately — no extra enable step required. Use the settings below to customize the kiosk display
            name and entrance (optional).
          </p>
          {kioskReady ? (
            <p className="admin-shopper-url-hint is-live">Live — assigned Customer accounts can sign in.</p>
          ) : form.enabled ? (
            <p className="admin-shopper-url-hint">Click Save shopper kiosk to activate.</p>
          ) : null}
        </div>
      ) : null}

      <div className="admin-shopper-actions">
        <button
          type="button"
          className="btn-primary"
          disabled={saving || layoutLoading || (form.enabled && !form.layoutId)}
          onClick={() => save().catch(() => {})}
          data-testid="admin-shopper-save"
        >
          {saving ? (
            <>
              <span className="loading-state-spinner loading-state-spinner--btn" aria-hidden />
              Saving…
            </>
          ) : (
            "Save shopper kiosk"
          )}
        </button>
      </div>
    </div>
  );
}
