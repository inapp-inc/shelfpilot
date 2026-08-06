import { useEffect, useState } from "react";
import { STORE_TYPES } from "../storeTypes.js";
import AlertBanner from "../components/AlertBanner.jsx";
import FieldError from "../components/FieldError.jsx";
import { validateLayoutCreate } from "../validationMessages.js";

export const EMPTY_CREATE_DRAFT = {
  name: "",
  storeTypeId: "hypermarket",
  widthMeters: 24,
  depthMeters: 16,
  heightMeters: 3.2,
  shape: "rectangle",
};

export default function LayoutCreateModal({ open, onClose, draft, setDraft, onSubmit, submitting, shelfTemplates = [] }) {
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) setErrors({});
  }, [open]);

  if (!open) return null;

  const form = draft || EMPTY_CREATE_DRAFT;

  function clearError(field) {
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  }

  function handleSubmit() {
    const check = validateLayoutCreate(form);
    if (!check.ok) {
      setErrors(check.errors);
      return;
    }
    setErrors({});
    onSubmit?.();
  }

  return (
    <div className="modal-backdrop" onClick={onClose} data-testid="layout-create-backdrop">
      <div className="modal layout-create-modal" onClick={(e) => e.stopPropagation()} data-testid="layout-create-modal">
        <div style={{ fontSize: 18, fontWeight: 800 }}>New store layout</div>
        <div className="section-label">Single form · choose store type and dimensions</div>

        {Object.keys(errors).length ? (
          <AlertBanner variant="error" onDismiss={() => setErrors({})} data-testid="layout-create-errors">
            Please fix the highlighted fields before creating the layout.
          </AlertBanner>
        ) : null}

        <div className={`field${errors.name ? " field-invalid" : ""}`}>
          <label>Store name</label>
          <input
            data-testid="layout-create-name"
            value={form.name}
            onChange={(e) => {
              setDraft({ ...form, name: e.target.value });
              clearError("name");
            }}
            placeholder="Downtown Hypermarket #12"
          />
          <FieldError message={errors.name} />
        </div>
        <div className="field">
          <label>Store type</label>
          <select
            data-testid="layout-create-store-type"
            value={form.storeTypeId}
            onChange={(e) => setDraft({ ...form, storeTypeId: e.target.value })}
          >
            {STORE_TYPES.map((st) => (
              <option key={st.id} value={st.id}>
                {st.emoji} {st.label}
              </option>
            ))}
          </select>
        </div>
        <div className="form-grid-3">
          <div className={`field${errors.widthMeters ? " field-invalid" : ""}`}>
            <label data-testid="layout-create-length-label">Length (m)</label>
            <input
              className="mono"
              type="number"
              min="1"
              data-testid="layout-create-length"
              value={form.widthMeters}
              onChange={(e) => {
                setDraft({ ...form, widthMeters: e.target.value });
                clearError("widthMeters");
              }}
            />
            <FieldError message={errors.widthMeters} />
          </div>
          <div className={`field${errors.depthMeters ? " field-invalid" : ""}`}>
            <label data-testid="layout-create-width-label">Width (m)</label>
            <input
              className="mono"
              type="number"
              min="1"
              data-testid="layout-create-width"
              value={form.depthMeters}
              onChange={(e) => {
                setDraft({ ...form, depthMeters: e.target.value });
                clearError("depthMeters");
              }}
            />
            <FieldError message={errors.depthMeters} />
          </div>
          <div className={`field${errors.heightMeters ? " field-invalid" : ""}`}>
            <label data-testid="layout-create-height-label">Height (m)</label>
            <input
              className="mono"
              type="number"
              min="1"
              step="0.1"
              data-testid="layout-create-height"
              value={form.heightMeters}
              onChange={(e) => {
                setDraft({ ...form, heightMeters: e.target.value });
                clearError("heightMeters");
              }}
            />
            <FieldError message={errors.heightMeters} />
          </div>
        </div>
        {shelfTemplates.length ? (
          <div
            style={{
              padding: "10px 12px",
              borderRadius: 10,
              background: "rgba(163,10,42,0.04)",
              border: "1px solid rgba(163,10,42,0.12)",
            }}
          >
            <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>Shared shelf layer</div>
            <div className="mono" style={{ fontSize: 11, color: "#6b7280", marginBottom: 8 }}>
              Inherited from Admin → Configuration for this store type. Edit templates there before creating layouts.
            </div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12 }}>
              {shelfTemplates.map((t) => (
                <li key={t.type} style={{ marginBottom: 4 }}>
                  {t.label}: {t.defaultWidthMeters} × {t.defaultDepthMeters} m · {t.defaultLevels} levels
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="field">
          <label>Floor shape</label>
          <div className="shape-toggle">
            {[
              { id: "rectangle", label: "Rectangle" },
              { id: "polygon", label: "Draw irregular in canvas" },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                className="btn-secondary"
                style={{
                  background: form.shape === opt.id ? "rgba(163,10,42,0.08)" : "#fff",
                  color: form.shape === opt.id ? "#A30A2A" : "#1f2933",
                }}
                onClick={() => setDraft({ ...form, shape: opt.id })}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="modal-actions">
          <button
            type="button"
            className="btn-secondary"
            data-testid="layout-create-cancel"
            style={{ padding: "10px 16px" }}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            data-testid="layout-create-submit"
            style={{ padding: "10px 20px" }}
            disabled={submitting}
            onClick={handleSubmit}
          >
            {submitting ? "Creating…" : "Create layout"}
          </button>
        </div>
      </div>
    </div>
  );
}
