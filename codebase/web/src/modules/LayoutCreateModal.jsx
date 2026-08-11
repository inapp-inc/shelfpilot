import { useEffect, useRef, useState } from "react";
import { STORE_TYPES } from "../storeTypes.js";
import AlertBanner from "../components/AlertBanner.jsx";
import FieldError from "../components/FieldError.jsx";
import { validateLayoutCreate } from "../validationMessages.js";
import {
  DEFAULT_CEILING_M,
  DEFAULT_FLOOR_PLAN_LONG_EDGE_M,
  dimensionsFromFloorPlanAspect,
  FLOOR_PLAN_ACCEPT,
  analyzeFloorPlanUpload,
} from "../floorPlanImport.js";
import { WAREHOUSE_DEFAULT_CEILING_M } from "../warehouseLayout.js";

const WAREHOUSE_CREATE_DEFAULTS = {
  widthMeters: 40,
  depthMeters: 30,
  heightMeters: WAREHOUSE_DEFAULT_CEILING_M,
};

export { dimensionsFromFloorPlanAspect };

export const EMPTY_CREATE_DRAFT = {
  name: "",
  storeTypeId: "hypermarket",
  footprintMode: "dimensions", // "dimensions" | "floorPlan"
  widthMeters: 24,
  depthMeters: 16,
  heightMeters: DEFAULT_CEILING_M,
  shape: "rectangle",
  floorPlanAnalyzed: false,
  floorPlanFileName: "",
  floorPlanSourceFileName: "",
  floorPlanSourceType: "",
  floorPlanPageIndex: 0,
  floorPlanPageCount: 0,
  floorPlanAspect: null,
  floorPlanDimensionSource: "",
  floorPlanDimensionSourceLabel: "",
  floorPlanMatchedText: "",
};

export default function LayoutCreateModal({ open, onClose, draft, setDraft, onSubmit, submitting, shelfTemplates = [] }) {
  const [errors, setErrors] = useState({});
  const [fileBusy, setFileBusy] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);

  useEffect(() => {
    if (open) setErrors({});
  }, [open]);

  if (!open) return null;

  const form = draft || EMPTY_CREATE_DRAFT;
  const footprintMode = form.footprintMode === "floorPlan" ? "floorPlan" : "dimensions";
  const pdfSource = form.floorPlanSourceType === "pdf";

  function clearError(field) {
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: "" }));
  }

  function clearFloorPlanFields() {
    return {
      floorPlanAnalyzed: false,
      floorPlanFileName: "",
      floorPlanSourceFileName: "",
      floorPlanSourceType: "",
      floorPlanPageIndex: 0,
      floorPlanPageCount: 0,
      floorPlanAspect: null,
      floorPlanDimensionSource: "",
      floorPlanDimensionSourceLabel: "",
      floorPlanMatchedText: "",
    };
  }

  function setMode(mode) {
    setDraft({
      ...form,
      footprintMode: mode,
      ...(mode === "dimensions"
        ? clearFloorPlanFields()
        : {
            heightMeters: form.heightMeters || DEFAULT_CEILING_M,
            ...dimensionsFromFloorPlanAspect(form.floorPlanAspect),
          }),
    });
    setErrors({});
  }

  async function ingestFloorPlanFile(file) {
    setFileBusy(true);
    try {
      const imported = await analyzeFloorPlanUpload(file);
      setDraft({
        ...form,
        ...imported,
        heightMeters: form.heightMeters || DEFAULT_CEILING_M,
      });
      clearError("floorPlan");
    } catch (err) {
      setErrors((prev) => ({ ...prev, floorPlan: err.message || "Could not read that file." }));
    } finally {
      setFileBusy(false);
    }
  }

  async function handleFloorPlanFile(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    await ingestFloorPlanFile(file);
  }

  function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    if (fileBusy || submitting) return;
    const file = e.dataTransfer?.files?.[0];
    if (file) ingestFloorPlanFile(file);
  }

  function handleSubmit() {
    let next = form;
    if (footprintMode === "floorPlan" && form.floorPlanAnalyzed) {
      next = {
        ...form,
        widthMeters: form.widthMeters,
        depthMeters: form.depthMeters,
        heightMeters: form.heightMeters || DEFAULT_CEILING_M,
        shape: "rectangle",
      };
      setDraft(next);
    }
    const check = validateLayoutCreate(next);
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
        <div className="section-label">Choose dimensions or upload a floor plan to build from</div>

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
            onChange={(e) => {
              const storeTypeId = e.target.value;
              const patch =
                storeTypeId === "warehouse"
                  ? WAREHOUSE_CREATE_DEFAULTS
                  : storeTypeId === form.storeTypeId
                    ? {}
                    : { widthMeters: 24, depthMeters: 16, heightMeters: DEFAULT_CEILING_M };
              setDraft({ ...form, storeTypeId, ...patch });
            }}
          >
            {STORE_TYPES.map((st) => (
              <option key={st.id} value={st.id}>
                {st.emoji} {st.label}
              </option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>Store floor</label>
          <div className="mode-toggle" data-testid="layout-create-footprint-mode" role="group" aria-label="Store floor definition">
            <button
              type="button"
              className={footprintMode === "dimensions" ? "active" : ""}
              data-testid="layout-create-mode-dimensions"
              onClick={() => setMode("dimensions")}
            >
              Enter dimensions
            </button>
            <button
              type="button"
              className={footprintMode === "floorPlan" ? "active" : ""}
              data-testid="layout-create-mode-floorplan"
              onClick={() => setMode("floorPlan")}
            >
              Upload floor plan
            </button>
          </div>
        </div>

        {footprintMode === "floorPlan" ? (
          <>
            <div className={`field${errors.floorPlan ? " field-invalid" : ""}`}>
              <input
                ref={fileRef}
                type="file"
                accept={FLOOR_PLAN_ACCEPT}
                style={{ display: "none" }}
                data-testid="layout-create-floorplan-input"
                onChange={handleFloorPlanFile}
              />
              <button
                type="button"
                className={`import-dropzone${form.floorPlanAnalyzed ? " has-file" : ""}${dragOver ? " drag-over" : ""}`}
                data-testid="layout-create-floorplan-pick"
                disabled={fileBusy || submitting}
                onClick={() => fileRef.current?.click()}
                onDragEnter={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOver(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  setDragOver(false);
                }}
                onDrop={handleDrop}
                style={{ width: "100%" }}
              >
                {form.floorPlanAnalyzed ? (
                  <div className="import-dropzone-file">
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        borderRadius: 8,
                        border: "1px solid #e5e7eb",
                        background: "#f0fdf4",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 22,
                        flexShrink: 0,
                      }}
                      aria-hidden
                    >
                      ✓
                    </div>
                    <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                      <div style={{ fontWeight: 700, fontSize: 13 }}>{form.floorPlanFileName || "Floor plan"}</div>
                      <div className="muted" style={{ fontSize: 12 }}>
                        {pdfSource && form.floorPlanPageCount > 1
                          ? `PDF page 1 · ${form.floorPlanPageCount} pages · drop to replace`
                          : "Analyzed — drop a new file or click to replace"}
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="import-dropzone-icon" style={{ fontSize: 22 }}>
                      🗺️
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 13 }}>
                      {fileBusy ? "Analyzing file…" : dragOver ? "Drop floor plan here" : "Choose or drop floor plan"}
                    </div>
                    <div className="muted" style={{ fontSize: 12 }}>
                      PNG, JPG, WEBP, SVG or PDF (page 1) · max 12 MB
                    </div>
                  </>
                )}
              </button>
              <FieldError message={errors.floorPlan} />
            </div>
            {form.floorPlanAnalyzed ? (
              <>
                <div
                  data-testid="layout-create-floorplan-analysis"
                  style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: "rgba(16,185,129,0.06)",
                    border: "1px solid rgba(16,185,129,0.2)",
                    marginBottom: 10,
                    fontSize: 12,
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: 4 }}>Dimensions from file</div>
                  <div>
                    Source: {form.floorPlanDimensionSourceLabel || "manual confirmation required"}
                    {form.floorPlanMatchedText ? (
                      <>
                        {" "}
                        · matched <span className="mono">{form.floorPlanMatchedText}</span>
                      </>
                    ) : null}
                  </div>
                  <div className="muted" style={{ marginTop: 4 }}>
                    Shelves and aisles will be generated automatically from these store dimensions — the drawing is not
                    shown on the canvas.
                  </div>
                </div>
                <div className="form-grid-3">
                  <div className={`field${errors.widthMeters ? " field-invalid" : ""}`}>
                    <label data-testid="layout-create-length-label">Length (m)</label>
                    <input
                      className="mono"
                      type="number"
                      min="1"
                      step="0.1"
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
                      step="0.1"
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
                <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>
                  {form.floorPlanDimensionSource === "manual" || form.floorPlanDimensionSource === "aspect" ? (
                    <>
                      Could not read exact dimensions from the file — suggested from{" "}
                      {form.floorPlanDimensionSource === "aspect" ? "drawing aspect" : "defaults"} (long edge{" "}
                      {DEFAULT_FLOOR_PLAN_LONG_EDGE_M} m). <strong>Confirm length and width</strong> before creating.
                    </>
                  ) : (
                    <>Review the parsed dimensions below and adjust if your plan uses different units or labels.</>
                  )}
                </div>
              </>
            ) : (
              <div className="muted" style={{ fontSize: 12 }}>
                Upload a drawing first. We read dimensions from the file text, SVG size, or file name, then build the
                store layout automatically.
              </div>
            )}
          </>
        ) : (
          <>
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
          </>
        )}

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
            disabled={submitting || fileBusy}
            onClick={handleSubmit}
          >
            {submitting ? "Creating…" : "Create layout"}
          </button>
        </div>
      </div>
    </div>
  );
}
