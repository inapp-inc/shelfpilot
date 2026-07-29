import { useEffect, useRef, useState } from "react";
import DrawerShell from "./DrawerShell.jsx";
import CategoryTreePicker from "./CategoryTreePicker.jsx";
import FieldError from "../components/FieldError.jsx";
import { validateProduct } from "../validationMessages.js";
import { resolveAssetUrl } from "../assetUrl.js";

const MAX_DIM = 256;

/** Resize an uploaded image to <=256px and return a compact data URL. */
function fileToResizedDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Unsupported image"));
      img.onload = () => {
        const scale = Math.min(1, MAX_DIM / Math.max(img.width, img.height));
        const w = Math.max(1, Math.round(img.width * scale));
        const h = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

export default function ProductFormDrawer({
  open,
  onClose,
  draft,
  setDraft,
  categories,
  onSubmit,
  onUploadImage,
  editDisabled,
}) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);
  const [imgBusy, setImgBusy] = useState(false);
  const [imgError, setImgError] = useState("");
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (open) setErrors({});
  }, [open, draft?.id]);

  if (!open || !draft) return null;

  function clearError(field) {
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    const check = validateProduct(draft);
    if (!check.ok) {
      setErrors(check.errors);
      return;
    }
    setErrors({});
    onSubmit?.();
  }

  async function acceptFile(file) {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setImgError("Please choose an image file.");
      return;
    }
    setImgError("");
    setImgBusy(true);
    try {
      if (onUploadImage) {
        const url = await onUploadImage(file, draft.name);
        setDraft({ ...draft, imageUrl: url });
      } else {
        const dataUrl = await fileToResizedDataUrl(file);
        setDraft({ ...draft, imageUrl: dataUrl });
      }
    } catch (err) {
      setImgError(err.message || "Could not load image");
    } finally {
      setImgBusy(false);
    }
  }

  return (
    <DrawerShell
      title={draft.id ? "Edit product" : "New product"}
      open={open}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn-secondary" style={{ padding: "10px 18px" }} onClick={onClose}>
            Cancel
          </button>
          <button
            type="submit"
            form="product-form"
            className="btn-primary"
            style={{ padding: "10px 22px" }}
            disabled={editDisabled || imgBusy}
          >
            {draft.id ? "Save changes" : "Create product"}
          </button>
        </>
      }
    >
      <form
        id="product-form"
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: 12 }}
      >
        <label className={`field${errors.name ? " field-invalid" : ""}`}>
          Name
          <input
            value={draft.name}
            onChange={(e) => {
              setDraft({ ...draft, name: e.target.value });
              clearError("name");
            }}
          />
          <FieldError message={errors.name} />
        </label>
        <label className="field">
          SKU
          <input value={draft.sku} onChange={(e) => setDraft({ ...draft, sku: e.target.value })} />
        </label>

        <div className="field" style={{ marginBottom: 0 }}>
          <span>Product image</span>
          <div
            className={`import-dropzone product-image-zone ${dragOver ? "drag-over" : ""} ${
              draft.imageUrl ? "has-file" : ""
            }`}
            onDragOver={(e) => {
              e.preventDefault();
              if (!editDisabled && !imgBusy) setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (editDisabled || imgBusy) return;
              acceptFile(e.dataTransfer.files?.[0]);
            }}
            onClick={() => !editDisabled && !imgBusy && inputRef.current?.click()}
            role="button"
            tabIndex={0}
          >
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => {
                acceptFile(e.target.files?.[0]);
                e.target.value = "";
              }}
            />
            {draft.imageUrl ? (
              <div className="product-image-preview">
                <img src={resolveAssetUrl(draft.imageUrl)} alt="Product" />
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span style={{ fontWeight: 700, fontSize: 13 }}>Image attached</span>
                  <button
                    type="button"
                    className="btn-secondary"
                    style={{ padding: "4px 10px", fontSize: 11 }}
                    disabled={editDisabled}
                    onClick={(e) => {
                      e.stopPropagation();
                      setDraft({ ...draft, imageUrl: "" });
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="import-dropzone-icon" style={{ fontSize: 26 }}>🖼️</div>
                <div style={{ fontWeight: 700, fontSize: 13 }}>
                  {imgBusy ? "Processing…" : "Drag & drop an image, or browse"}
                </div>
                <div className="muted" style={{ fontSize: 11 }}>PNG / JPG · saved to product-images folder</div>
              </>
            )}
          </div>
          <input
            type="url"
            placeholder="…or paste an image URL"
            value={draft.imageUrl && !draft.imageUrl.startsWith("data:") ? draft.imageUrl : ""}
            onChange={(e) => setDraft({ ...draft, imageUrl: e.target.value })}
            disabled={editDisabled || imgBusy}
            style={{ marginTop: 8 }}
          />
          {imgError ? <FieldError message={imgError} /> : null}
        </div>

        <label className={`field${errors.categoryId ? " field-invalid" : ""}`}>
          Category
          <CategoryTreePicker
            categories={categories}
            value={draft.categoryId}
            onChange={(id) => {
              setDraft({ ...draft, categoryId: id || "" });
              clearError("categoryId");
            }}
            allowEmpty={false}
            emptyLabel="Select category"
            disabled={editDisabled}
          />
          <FieldError message={errors.categoryId} />
        </label>
        <div className="form-grid-3">
          <label className={`field${errors.widthMeters ? " field-invalid" : ""}`}>
            Width (m)
            <input
              className="mono"
              type="number"
              step="0.01"
              min="0"
              value={draft.widthMeters}
              onChange={(e) => {
                setDraft({ ...draft, widthMeters: e.target.value });
                clearError("widthMeters");
              }}
            />
            <FieldError message={errors.widthMeters} />
          </label>
          <label className={`field${errors.heightMeters ? " field-invalid" : ""}`}>
            Height (m)
            <input
              className="mono"
              type="number"
              step="0.01"
              min="0"
              value={draft.heightMeters}
              onChange={(e) => {
                setDraft({ ...draft, heightMeters: e.target.value });
                clearError("heightMeters");
              }}
            />
            <FieldError message={errors.heightMeters} />
          </label>
          <label className={`field${errors.depthMeters ? " field-invalid" : ""}`}>
            Depth (m)
            <input
              className="mono"
              type="number"
              step="0.01"
              min="0"
              value={draft.depthMeters ?? ""}
              onChange={(e) => {
                setDraft({ ...draft, depthMeters: e.target.value });
                clearError("depthMeters");
              }}
            />
            <FieldError message={errors.depthMeters} />
          </label>
        </div>
        <p className="muted" style={{ fontSize: 11.5, margin: 0 }}>
          Width, height, and depth drive front facings, levels, and backward depth on shelves.
        </p>
      </form>
    </DrawerShell>
  );
}
