import { useEffect, useRef, useState } from "react";
import { STORE_TYPES } from "../storeTypes.js";
import AlertBanner from "../components/AlertBanner.jsx";
import { validateImportFile } from "../validationMessages.js";

const ACCEPT = [".xlsx", ".xls", ".csv"];

function fileSizeLabel(bytes) {
  if (!bytes && bytes !== 0) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Import dialog: pick target store type + drag & drop / browse an Excel file. */
export default function ImportDialog({ open, defaultStoreTypeId, importing, onImport, onClose }) {
  const [storeTypeId, setStoreTypeId] = useState(defaultStoreTypeId || STORE_TYPES[0].id);
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) {
      setStoreTypeId(defaultStoreTypeId || STORE_TYPES[0].id);
      setFile(null);
      setError("");
      setDragOver(false);
    }
  }, [open, defaultStoreTypeId]);

  if (!open) return null;

  function acceptFile(f) {
    if (!f) return;
    const check = validateImportFile(f);
    if (!check.ok) {
      setError(check.error);
      setFile(null);
      return;
    }
    setError("");
    setFile(f);
  }

  function onDrop(e) {
    e.preventDefault();
    setDragOver(false);
    if (importing) return;
    acceptFile(e.dataTransfer.files?.[0]);
  }

  const storeType = STORE_TYPES.find((s) => s.id === storeTypeId) || STORE_TYPES[0];

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && !importing && onClose()}>
      <div className="modal">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <strong style={{ fontSize: 17 }}>Import products from Excel</strong>
          <button
            type="button"
            className="btn-secondary"
            style={{ padding: "6px 10px", fontSize: 12 }}
            disabled={importing}
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <div className="field" style={{ margin: 0 }}>
          <label>Store type</label>
          <select
            value={storeTypeId}
            disabled={importing}
            onChange={(e) => setStoreTypeId(e.target.value)}
            style={{ padding: "10px 11px", borderRadius: 8, border: "1px solid #e5e7eb", width: "100%" }}
          >
            {STORE_TYPES.map((s) => (
              <option key={s.id} value={s.id}>
                {s.emoji} {s.label}
              </option>
            ))}
          </select>
          <span className="muted" style={{ fontSize: 11.5 }}>
            Imported categories and products are added to <strong>{storeType.label}</strong>. Rows with a
            valid <code>storeType</code> column keep their own type.
          </span>
        </div>

        <div
          className={`import-dropzone ${dragOver ? "drag-over" : ""} ${file ? "has-file" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            if (!importing) setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => !importing && inputRef.current?.click()}
          role="button"
          tabIndex={0}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT.join(",")}
            style={{ display: "none" }}
            onChange={(e) => {
              acceptFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          {file ? (
            <div className="import-dropzone-file">
              <span className="import-dropzone-icon">📄</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>{file.name}</div>
                <div className="muted mono" style={{ fontSize: 11 }}>{fileSizeLabel(file.size)}</div>
              </div>
              {!importing ? (
                <button
                  type="button"
                  className="btn-secondary"
                  style={{ padding: "4px 8px", fontSize: 11, marginLeft: "auto" }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                >
                  Remove
                </button>
              ) : null}
            </div>
          ) : (
            <>
              <div className="import-dropzone-icon" style={{ fontSize: 30 }}>⬆️</div>
              <div style={{ fontWeight: 700, fontSize: 14 }}>Drag &amp; drop your Excel file here</div>
              <div className="muted" style={{ fontSize: 12 }}>
                or <span style={{ color: "#A30A2A", fontWeight: 700 }}>browse</span> · .xlsx, .xls, .csv
              </div>
            </>
          )}
        </div>

        {error ? (
          <AlertBanner variant="error" onDismiss={() => setError("")}>
            {error}
          </AlertBanner>
        ) : null}

        <div className="modal-actions">
          <button type="button" className="btn-secondary" style={{ padding: "9px 14px" }} disabled={importing} onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-primary"
            style={{ padding: "9px 16px" }}
            disabled={importing || !file}
            onClick={() => {
              const check = validateImportFile(file);
              if (!check.ok) {
                setError(check.error);
                return;
              }
              onImport(file, storeTypeId);
            }}
          >
            {importing ? "Importing…" : `Import to ${storeType.label}`}
          </button>
        </div>
      </div>
    </div>
  );
}
