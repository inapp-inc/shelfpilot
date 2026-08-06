import { useEffect, useState } from "react";
import DrawerShell from "./DrawerShell.jsx";
import FieldError from "../components/FieldError.jsx";
import { validateCategory } from "../validationMessages.js";
import { STORAGE_TYPE_OPTIONS, normalizeStorageType, resolveCategoryStorageType } from "../storageType.js";

export default function CategoryFormDrawer({ open, onClose, vertical, categories, draft, setDraft, onSubmit, editDisabled }) {
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) setErrors({});
  }, [open, draft?.id]);

  if (!open || !draft) return null;

  const parents = (categories || []).filter((c) => !c.parentId && c.id !== draft.id);

  function clearError(field) {
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const check = validateCategory(draft);
    if (!check.ok) {
      setErrors(check.errors);
      return;
    }
    setErrors({});
    onSubmit?.();
  }

  return (
    <DrawerShell
      title={draft.id ? "Edit category" : "New category"}
      open={open}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn-secondary" style={{ padding: "10px 18px" }} onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            form="category-form"
            className="btn-primary"
            data-testid="category-form-submit"
            style={{ padding: "10px 22px" }}
            disabled={editDisabled}
          >
            {draft.id ? "Save changes" : "Create category"}
          </button>
        </>
      }
    >
      <form
        id="category-form"
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: 12 }}
      >
        <label className={`field${errors.name ? " field-invalid" : ""}`}>
          Name
          <input
            data-testid="category-form-name"
            value={draft.name}
            onChange={(e) => {
              setDraft({ ...draft, name: e.target.value });
              clearError("name");
            }}
          />
          <FieldError message={errors.name} />
        </label>
        <label className="field">
          Parent (optional)
          <select
            value={draft.parentId || ""}
            onChange={(e) => setDraft({ ...draft, parentId: e.target.value || null })}
          >
            <option value="">Top level</option>
            {parents.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </label>
        <div className={`field${errors.color ? " field-invalid" : ""}`}>
          <span>Color</span>
          <div className="color-field">
            <input
              type="color"
              className="color-swatch-input"
              value={draft.color || "#A30A2A"}
              onChange={(e) => {
                setDraft({ ...draft, color: e.target.value });
                clearError("color");
              }}
            />
            <input
              className="mono"
              value={draft.color || "#A30A2A"}
              onChange={(e) => {
                setDraft({ ...draft, color: e.target.value });
                clearError("color");
              }}
              style={{ flex: 1 }}
              maxLength={7}
            />
          </div>
          <FieldError message={errors.color} />
          <div className="color-presets">
            {["#A30A2A", "#C4183A", "#0EA5E9", "#16A34A", "#F59E0B", "#7C3AED", "#DB2777", "#0F766E", "#64748B", "#111827"].map(
              (c) => (
                <button
                  key={c}
                  type="button"
                  className={`color-preset ${(draft.color || "").toLowerCase() === c.toLowerCase() ? "active" : ""}`}
                  style={{ background: c }}
                  title={c}
                  aria-label={`Use ${c}`}
                  onClick={() => {
                    setDraft({ ...draft, color: c });
                    clearError("color");
                  }}
                />
              )
            )}
          </div>
        </div>
        <label className="field">
          Storage type
          <select
            value={normalizeStorageType(draft.storageType || "ambient")}
            onChange={(e) => setDraft({ ...draft, storageType: e.target.value })}
            disabled={editDisabled}
          >
            {STORAGE_TYPE_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.emoji} {opt.label}
              </option>
            ))}
          </select>
          <span className="muted" style={{ fontSize: 11 }}>
            Product dropdowns on shelves only list products with this storage type.
          </span>
        </label>
        <div className="muted" style={{ fontSize: 12 }}>
          Vertical: <strong>{vertical}</strong>
        </div>
      </form>
    </DrawerShell>
  );
}
