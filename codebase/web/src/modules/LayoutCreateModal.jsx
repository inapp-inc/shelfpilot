import { STORE_TYPES } from "../storeTypes.js";

export const EMPTY_CREATE_DRAFT = {
  name: "",
  storeTypeId: "hypermarket",
  widthMeters: 40,
  depthMeters: 25,
  heightMeters: 3,
  shape: "rectangle",
};

export default function LayoutCreateModal({ open, onClose, draft, setDraft, onSubmit, submitting }) {
  if (!open) return null;

  const form = draft || EMPTY_CREATE_DRAFT;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal layout-create-modal" onClick={(e) => e.stopPropagation()}>
        <div style={{ fontSize: 18, fontWeight: 800 }}>New store layout</div>
        <div className="section-label">Single form · choose store type and dimensions</div>

        <div className="field">
          <label>Store name</label>
          <input
            value={form.name}
            onChange={(e) => setDraft({ ...form, name: e.target.value })}
            placeholder="Downtown Hypermarket #12"
          />
        </div>
        <div className="field">
          <label>Store type</label>
          <select
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
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          <div className="field">
            <label>Width (m)</label>
            <input
              className="mono"
              type="number"
              min="1"
              value={form.widthMeters}
              onChange={(e) => setDraft({ ...form, widthMeters: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Depth (m)</label>
            <input
              className="mono"
              type="number"
              min="1"
              value={form.depthMeters}
              onChange={(e) => setDraft({ ...form, depthMeters: e.target.value })}
            />
          </div>
          <div className="field">
            <label>Height (m)</label>
            <input
              className="mono"
              type="number"
              min="1"
              step="0.1"
              value={form.heightMeters}
              onChange={(e) => setDraft({ ...form, heightMeters: e.target.value })}
            />
          </div>
        </div>
        <div className="field">
          <label>Floor shape</label>
          <div style={{ display: "flex", gap: 8 }}>
            {[
              { id: "rectangle", label: "Rectangle" },
              { id: "polygon", label: "Draw irregular in canvas" },
            ].map((opt) => (
              <button
                key={opt.id}
                type="button"
                className="btn-secondary"
                style={{
                  flex: 1,
                  padding: 9,
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

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4 }}>
          <button type="button" className="btn-secondary" style={{ padding: "10px 16px" }} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            style={{ padding: "10px 20px" }}
            disabled={submitting || !form.name?.trim()}
            onClick={onSubmit}
          >
            {submitting ? "Creating…" : "Create layout"}
          </button>
        </div>
      </div>
    </div>
  );
}
