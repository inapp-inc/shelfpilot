import CategoryTreePicker from "../catalog/CategoryTreePicker.jsx";
import { FIXTURE_TYPES } from "../referenceCatalog.js";
import { categoryLabel } from "../catalog/buildCategoryTree.js";
import { formatDimensionTripleInches, formatWeightFromKg, lbInputFromKg, lbToKg } from "../units.js";
import { defaultLevelLoadKg } from "../shelfLoad.js";
import { colorForCategoryId } from "../categoryColors.js";

const TEMPERATURE_ZONES = {
  ambient: { emoji: "🌡️", label: "Ambient" },
  chilled: { emoji: "🧊", label: "Chilled" },
  frozen: { emoji: "❄️", label: "Frozen" },
};

function resolveShelfTypeLabel(type, fixtureTypes) {
  return (
    fixtureTypes.find((t) => t.type === type)?.label ||
    FIXTURE_TYPES[type]?.label ||
    type ||
    "Shelf"
  );
}

/** Compact shelf properties + category — lives in the planogram dialog sidebar. */
export default function ShelfPlanogramConfig({
  shelfRaw,
  faceCategory,
  faceId,
  faceLabel,
  levels = [],
  categories,
  products,
  fixtureTypes = [],
  editDisabled,
  onPatchShelf,
  onMapShelf,
  onDeleteShelf,
  mapTarget,
  hideTitle = false,
  compact = false,
}) {
  if (!shelfRaw) return null;

  const zone = TEMPERATURE_ZONES[shelfRaw.temperatureZone || "ambient"] || TEMPERATURE_ZONES.ambient;
  const typeLabel = resolveShelfTypeLabel(shelfRaw.type, fixtureTypes);
  const usable = Number(shelfRaw.usableWidthMeters ?? shelfRaw.widthMeters) || 1.2;
  const depth = Number(shelfRaw.depthMeters) || 0.6;
  const height = Number(shelfRaw.heightMeters) || 2;
  const defaultLoadKg = defaultLevelLoadKg(shelfRaw);

  function mapCategory(categoryId) {
    if (!categoryId || !mapTarget) return;
    const cat = categories.find((c) => c.id === categoryId);
    if (!cat) return;
    onMapShelf?.(mapTarget.shelfId, cat.id, colorForCategoryId(categories, cat.id), mapTarget.faceId);
  }

  return (
    <div className={`planogram-shelf-config${compact ? " planogram-shelf-config--compact" : ""}`}>
      {!hideTitle && !compact ? (
        <div className="planogram-shelf-config-head">
          <strong>Shelf settings</strong>
          <span className="planogram-shelf-config-face mono">{faceLabel}</span>
        </div>
      ) : null}

      {compact ? (
        <div className="planogram-shelf-config-compact-head">
          <strong>Shelf settings</strong>
          <span className="planogram-shelf-config-face mono">{faceLabel}</span>
        </div>
      ) : null}

      {!compact ? (
        <>
          <div className="planogram-shelf-config-face-row">
            <span className="planogram-shelf-config-face-chip mono">{faceLabel}</span>
            {faceCategory ? (
              <span className="planogram-shelf-config-cat-chip cat-chip">
                {categoryLabel(categories, faceCategory)}
              </span>
            ) : (
              <span className="planogram-shelf-config-cat-chip planogram-shelf-config-cat-chip--warn">
                No category
              </span>
            )}
          </div>
          <div className="planogram-shelf-config-meta">
            <span className="planogram-shelf-meta-chip">{typeLabel}</span>
            <span className="planogram-shelf-meta-chip">{zone.emoji} {zone.label}</span>
            <span className="planogram-shelf-meta-chip mono">
              {formatDimensionTripleInches(usable, depth, height)}
            </span>
            <span className="planogram-shelf-meta-chip">
              {levels.length} level{levels.length === 1 ? "" : "s"}
            </span>
          </div>
        </>
      ) : null}

      <div className="planogram-shelf-config-field planogram-shelf-config-category">
        <span>Shelf category {faceId === "B" ? "(face B)" : faceId === "A" ? "(face A)" : ""}</span>
        {compact && faceCategory ? (
          <span className="planogram-shelf-config-current-cat muted">{categoryLabel(categories, faceCategory)}</span>
        ) : null}
        <CategoryTreePicker
          categories={categories}
          products={products}
          value={faceCategory || ""}
          onChange={(id) => {
            if (id) mapCategory(id);
          }}
          disabled={editDisabled}
          showCounts
          emptyLabel="Choose category…"
        />
        {compact ? (
          <span className="planogram-shelf-config-category-hint muted">
            Sets which products can be placed on this shelf face.
          </span>
        ) : null}
      </div>

      <div className="planogram-shelf-config-row2">
        <label className="planogram-shelf-config-field">
          <span>Name</span>
          <input
            type="text"
            disabled={editDisabled}
            value={shelfRaw.label || ""}
            placeholder={faceLabel ? `Shelf ${faceLabel}` : "Shelf"}
            onChange={(e) => onPatchShelf?.(shelfRaw.id, { label: e.target.value })}
          />
        </label>
        {fixtureTypes.length > 0 ? (
          <label className="planogram-shelf-config-field">
            <span>Type</span>
            <select
              disabled={editDisabled}
              value={shelfRaw.type || fixtureTypes[0]?.type || "shelf"}
              onChange={(e) => onPatchShelf?.(shelfRaw.id, { type: e.target.value })}
            >
              {fixtureTypes.map((t) => (
                <option key={t.type} value={t.type}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>

      <details className="planogram-shelf-config-advanced">
        <summary>Dimensions & load</summary>
        <div className="planogram-shelf-config-dims">
          <label className="planogram-shelf-config-field">
            <span>W (m)</span>
            <input
              className="mono"
              type="number"
              step="0.1"
              disabled={editDisabled}
              value={usable}
              onChange={(e) =>
                onPatchShelf?.(shelfRaw.id, {
                  usableWidthMeters: Number(e.target.value),
                  widthMeters: Number(e.target.value),
                })
              }
            />
          </label>
          <label className="planogram-shelf-config-field">
            <span>D (m)</span>
            <input
              className="mono"
              type="number"
              step="0.1"
              disabled={editDisabled}
              value={depth}
              onChange={(e) => onPatchShelf?.(shelfRaw.id, { depthMeters: Number(e.target.value) })}
            />
          </label>
          <label className="planogram-shelf-config-field">
            <span>H (m)</span>
            <input
              className="mono"
              type="number"
              step="0.1"
              disabled={editDisabled}
              value={height}
              onChange={(e) => onPatchShelf?.(shelfRaw.id, { heightMeters: Number(e.target.value) })}
            />
          </label>
        </div>
        <div className="planogram-shelf-config-dims">
          <label className="planogram-shelf-config-field">
            <span>Load / lvl (lb)</span>
            <input
              className="mono"
              type="number"
              step="1"
              min="0"
              disabled={editDisabled}
              placeholder={lbInputFromKg(defaultLoadKg)}
              value={lbInputFromKg(shelfRaw.maxLoadKgPerLevel, "")}
              onChange={(e) =>
                onPatchShelf?.(shelfRaw.id, {
                  maxLoadKgPerLevel: e.target.value === "" ? null : lbToKg(e.target.value),
                })
              }
            />
          </label>
          <label className="planogram-shelf-config-field">
            <span>Load / unit (lb)</span>
            <input
              className="mono"
              type="number"
              step="1"
              min="0"
              disabled={editDisabled}
              placeholder={lbInputFromKg(defaultLoadKg * Math.max(1, levels.length))}
              value={lbInputFromKg(shelfRaw.maxLoadKg, "")}
              onChange={(e) =>
                onPatchShelf?.(shelfRaw.id, {
                  maxLoadKg: e.target.value === "" ? null : lbToKg(e.target.value),
                })
              }
            />
          </label>
        </div>
      </details>

      {!editDisabled ? (
        <button type="button" className="btn-danger planogram-shelf-config-delete" onClick={() => onDeleteShelf?.(shelfRaw.id)}>
          Delete shelf
        </button>
      ) : null}
    </div>
  );
}
