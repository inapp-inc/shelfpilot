import DrawerShell from "./DrawerShell.jsx";

export default function CategoryFormDrawer({ open, onClose, vertical, categories, draft, setDraft, onSubmit, editDisabled }) {
  if (!open || !draft) return null;

  const parents = (categories || []).filter((c) => !c.parentId && c.id !== draft.id);

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
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit?.();
        }}
        style={{ display: "flex", flexDirection: "column", gap: 12 }}
      >
        <label className="field">
          Name
          <input required value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
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
        <div className="field">
          <span>Color</span>
          <div className="color-field">
            <input
              type="color"
              className="color-swatch-input"
              value={draft.color || "#A30A2A"}
              onChange={(e) => setDraft({ ...draft, color: e.target.value })}
            />
            <input
              className="mono"
              value={draft.color || "#A30A2A"}
              onChange={(e) => setDraft({ ...draft, color: e.target.value })}
              style={{ flex: 1 }}
              maxLength={7}
            />
          </div>
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
                  onClick={() => setDraft({ ...draft, color: c })}
                />
              )
            )}
          </div>
        </div>
        <div className="muted" style={{ fontSize: 12 }}>
          Vertical: <strong>{vertical}</strong>
        </div>
      </form>
    </DrawerShell>
  );
}
