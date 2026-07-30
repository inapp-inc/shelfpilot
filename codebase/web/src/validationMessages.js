/** Map API / domain error codes to user-facing copy. */
const ERROR_MESSAGES = {
  unauthorized: "Session expired or invalid. Please sign in again.",
  forbidden: "You don't have permission to perform this action.",
  invalid_credentials: "Invalid email or password.",
  not_found: "The requested item was not found.",
  missing_fields: "Please fill in all required fields.",
  containment_violation: "Keep fixtures inside the drawn floor area.",
  overlap_violation: "Aisles cannot overlap shelves or each other.",
  invalid_polygon: "Invalid floor shape — check that vertices don't cross.",
  polygon_too_many_vertices: "Floor shape has too many vertices.",
  submit_not_allowed: "No changes to submit yet.",
  review_comment_required: "A rejection comment is required.",
  not_in_review: "This layout is not awaiting review.",
  approval_disabled: "Approval workflow is disabled for this store type.",
  aisle_not_found: "Aisle not found.",
  zone_not_found: "Zone not found.",
  entry_not_found: "Entry point not found.",
  segment_out_of_range: "Bay split is outside the shelf width.",
  segment_overlap: "Bay segments overlap — adjust split positions.",
  invalid_image_file: "Unsupported image file.",
  duplicate_sku: "A product with this SKU already exists.",
  duplicate_email: "A user with this email already exists.",
};

export function friendlyError(err, fallback = "Something went wrong. Please try again.") {
  const code = typeof err === "string" ? err : err?.message;
  if (!code) return fallback;
  if (ERROR_MESSAGES[code]) return ERROR_MESSAGES[code];
  if (code.startsWith("HTTP ")) return fallback;
  return code.replace(/_/g, " ");
}

function trim(v) {
  return String(v ?? "").trim();
}

function positiveNumber(v, label, { min = 0.1, max = 9999 } = {}) {
  const n = Number(v);
  if (!Number.isFinite(n)) return `${label} must be a number.`;
  if (n < min) return `${label} must be at least ${min}.`;
  if (n > max) return `${label} must be at most ${max}.`;
  return null;
}

export function validateLayoutCreate(draft) {
  const errors = {};
  if (!trim(draft?.name)) errors.name = "Store name is required.";
  const w = positiveNumber(draft?.widthMeters, "Width", { min: 1, max: 500 });
  if (w) errors.widthMeters = w;
  const d = positiveNumber(draft?.depthMeters, "Depth", { min: 1, max: 500 });
  if (d) errors.depthMeters = d;
  const h = positiveNumber(draft?.heightMeters, "Height", { min: 1, max: 20 });
  if (h) errors.heightMeters = h;
  return { ok: Object.keys(errors).length === 0, errors };
}

export function validateProduct(draft) {
  const errors = {};
  if (!trim(draft?.name)) errors.name = "Product name is required.";
  if (!trim(draft?.categoryId)) errors.categoryId = "Select a category.";
  if (draft?.widthMeters !== "" && draft?.widthMeters != null) {
    const w = positiveNumber(draft.widthMeters, "Width", { min: 0.01, max: 10 });
    if (w) errors.widthMeters = w;
  }
  if (draft?.heightMeters !== "" && draft?.heightMeters != null) {
    const h = positiveNumber(draft.heightMeters, "Height", { min: 0.01, max: 10 });
    if (h) errors.heightMeters = h;
  }
  if (draft?.depthMeters !== "" && draft?.depthMeters != null) {
    const d = positiveNumber(draft.depthMeters, "Depth", { min: 0.01, max: 10 });
    if (d) errors.depthMeters = d;
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

export function validateCategory(draft) {
  const errors = {};
  if (!trim(draft?.name)) errors.name = "Category name is required.";
  const color = trim(draft?.color);
  if (color && !/^#[0-9A-Fa-f]{6}$/.test(color)) {
    errors.color = "Use a valid hex color (e.g. #A30A2A).";
  }
  return { ok: Object.keys(errors).length === 0, errors };
}

export function validateUser(user) {
  const errors = {};
  if (!trim(user?.name)) errors.name = "Name is required.";
  const email = trim(user?.email);
  if (!email) errors.email = "Email is required.";
  else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = "Enter a valid email address.";
  if (!trim(user?.password)) errors.password = "Password is required.";
  else if (user.password.length < 6) errors.password = "Password must be at least 6 characters.";
  return { ok: Object.keys(errors).length === 0, errors };
}

export function validateImportFile(file) {
  if (!file) return { ok: false, error: "Choose an Excel or CSV file to import." };
  const lower = String(file.name || "").toLowerCase();
  if (![".xlsx", ".xls", ".csv"].some((ext) => lower.endsWith(ext))) {
    return { ok: false, error: "Unsupported file. Use .xlsx, .xls, or .csv." };
  }
  return { ok: true };
}

export function validateFixtureTemplates(templates) {
  const errors = [];
  const seenTypes = new Set();
  (templates || []).forEach((row, idx) => {
    const label = String(row.label || row.type || "").trim();
    if (!label) errors.push(`Row ${idx + 1}: Shelf name is required.`);
    const type = String(row.type || "").trim();
    if (!type) errors.push(`Row ${idx + 1}: Shelf type id is required.`);
    else if (seenTypes.has(type)) errors.push(`Row ${idx + 1}: Duplicate shelf type "${type}".`);
    else seenTypes.add(type);
    const w = positiveNumber(row.defaultWidthMeters, "Width", { min: 0.3, max: 50 });
    const d = positiveNumber(row.defaultDepthMeters, "Depth", { min: 0.3, max: 50 });
    const h = positiveNumber(row.defaultHeightMeters, "Height", { min: 0.5, max: 20 });
    const levels = Number(row.defaultLevels);
    if (w) errors.push(`Row ${idx + 1}: ${w}`);
    if (d) errors.push(`Row ${idx + 1}: ${d}`);
    if (h) errors.push(`Row ${idx + 1}: ${h}`);
    if (!Number.isFinite(levels) || levels < 1 || levels > 20) {
      errors.push(`Row ${idx + 1}: Levels must be between 1 and 20.`);
    }
  });
  return { ok: errors.length === 0, errors };
}

export function firstErrorMessage(errors) {
  if (!errors || typeof errors !== "object") return null;
  const vals = Object.values(errors);
  return vals.find(Boolean) || null;
}
