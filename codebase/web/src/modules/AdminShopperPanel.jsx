import { useEffect, useState } from "react";
import { api } from "../api.js";
import { pathForModule } from "../routes.js";

/** Admin — configure the single public shopper / kiosk layout. */
export default function AdminShopperPanel({ token, layouts = [], toast }) {
  const [form, setForm] = useState({
    enabled: false,
    layoutId: "",
    displayName: "",
    entryPointId: "",
  });
  const [entryPoints, setEntryPoints] = useState([]);
  const [layoutName, setLayoutName] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    api("/admin/shopper-experience", { token })
      .then((data) => {
        setForm({
          enabled: Boolean(data.enabled),
          layoutId: data.layoutId || "",
          displayName: data.displayName || "",
          entryPointId: data.entryPointId || "",
        });
        setEntryPoints(data.entryPoints || []);
        setLayoutName(data.layoutName || "");
      })
      .catch((e) => toast?.(e.message))
      .finally(() => setLoading(false));
  }, [token, toast]);

  async function onLayoutChange(layoutId) {
    setForm((f) => ({ ...f, layoutId, entryPointId: "" }));
    if (!layoutId || !token) {
      setEntryPoints([]);
      setLayoutName("");
      return;
    }
    try {
      const layout = await api(`/layouts/${layoutId}`, { token });
      setLayoutName(layout.name || layoutId);
      setEntryPoints(
        (layout.entryPoints || []).map((e) => ({ id: e.id, label: e.label || "Entrance" }))
      );
      if (layout.entryPoints?.length === 1) {
        setForm((f) => ({ ...f, layoutId, entryPointId: layout.entryPoints[0].id }));
      }
    } catch (e) {
      toast?.(e.message);
    }
  }

  async function save() {
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
      setEntryPoints(data.entryPoints || []);
      setLayoutName(data.layoutName || "");
      toast?.("Shopper kiosk updated", { type: "success" });
    } catch (e) {
      toast?.(e.message);
    } finally {
      setSaving(false);
    }
  }

  const publicUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}${pathForModule("shop", form.layoutId || null)}`
      : pathForModule("shop", form.layoutId || null);

  if (loading) return <p className="muted">Loading shopper settings…</p>;

  return (
    <div className="admin-shopper-panel" data-testid="admin-shopper-panel">
      <p className="muted" style={{ fontSize: 13, margin: "0 0 12px" }}>
        Configure the public kiosk and mobile QR experience. Shoppers only see this layout — no login, no other
        stores.
      </p>

      <label className="admin-shopper-check">
        <input
          type="checkbox"
          checked={form.enabled}
          onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
          data-testid="admin-shopper-enabled"
        />
        Enable shopper wayfinding kiosk
      </label>

      <div className="field">
        <label>Shopper layout</label>
        <select
          value={form.layoutId}
          data-testid="admin-shopper-layout"
          onChange={(e) => onLayoutChange(e.target.value)}
        >
          <option value="">Select layout…</option>
          {layouts.map((l) => (
            <option key={l.id} value={l.id}>
              {l.name} ({l.status})
            </option>
          ))}
        </select>
      </div>

      <div className="field">
        <label>Display name (optional)</label>
        <input
          type="text"
          value={form.displayName}
          placeholder={layoutName || "Store name on kiosk"}
          onChange={(e) => setForm({ ...form, displayName: e.target.value })}
          data-testid="admin-shopper-display-name"
        />
      </div>

      <div className="field">
        <label>Start location (entry point)</label>
        <select
          value={form.entryPointId}
          disabled={!entryPoints.length}
          data-testid="admin-shopper-entry"
          onChange={(e) => setForm({ ...form, entryPointId: e.target.value })}
        >
          <option value="">Select entrance…</option>
          {entryPoints.map((e) => (
            <option key={e.id} value={e.id}>
              {e.label}
            </option>
          ))}
        </select>
        {!entryPoints.length && form.layoutId ? (
          <span className="muted" style={{ fontSize: 11 }}>
            Add an entry point on the layout (Zones panel) first.
          </span>
        ) : null}
      </div>

      <div className="admin-shopper-preview muted mono" style={{ fontSize: 12 }}>
        Public URL:{" "}
        {form.layoutId ? (
          <a href={publicUrl}>{publicUrl}</a>
        ) : (
          <span>Select a layout to generate the kiosk URL</span>
        )}
      </div>

      <button
        type="button"
        className="btn-primary"
        disabled={saving || (form.enabled && (!form.layoutId || !form.entryPointId))}
        onClick={() => save().catch(() => {})}
        data-testid="admin-shopper-save"
      >
        {saving ? "Saving…" : "Save shopper kiosk"}
      </button>
    </div>
  );
}
