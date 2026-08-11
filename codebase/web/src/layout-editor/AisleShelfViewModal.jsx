import { useEffect, useMemo, useRef, useState } from "react";
import { categoryLabel } from "../catalog/buildCategoryTree.js";
import { colorForCategoryId } from "../categoryColors.js";
import { emojiForCategoryId } from "../storeTypes.js";
import {
  buildAisleShelfView,
  shelfStripCategory,
  shelfStripProducts,
} from "./aisleShelfView.js";
import { normalizeShelfUI } from "./shelfFaces.js";

function ProductThumb({ product, size = 28 }) {
  const url = product?.imageUrl;
  if (url) {
    return (
      <img
        src={url}
        alt=""
        className="aisle-shelf-view-thumb"
        width={size}
        height={size}
        loading="lazy"
      />
    );
  }
  return (
    <span className="aisle-shelf-view-thumb aisle-shelf-view-thumb--placeholder" aria-hidden>
      📦
    </span>
  );
}

function ShelfStripCard({
  slot,
  shelf,
  categories,
  products,
  selected,
  onSelect,
  onOpenPlanogram,
  editDisabled,
}) {
  const norm = shelf ? normalizeShelfUI(shelf) : null;
  const category = shelfStripCategory(norm, categories);
  const previewProducts = shelfStripProducts(norm, products, { max: 4 });
  const color = category ? colorForCategoryId(categories, category.id) : "#94a3b8";
  const emoji = category ? emojiForCategoryId(categories, category.id) : "▢";

  return (
    <button
      type="button"
      className={`aisle-shelf-view-card${selected ? " is-selected" : ""}`}
      data-testid="aisle-shelf-strip-card"
      data-shelf-label={slot.label}
      onClick={() => onSelect?.(slot.shelfId)}
    >
      <div className="aisle-shelf-view-card-head">
        <span className="aisle-shelf-view-label mono">{slot.label}</span>
        {category ? (
          <span className="aisle-shelf-view-cat" style={{ borderColor: color, color }}>
            {emoji} {categoryLabel(categories, category.id)}
          </span>
        ) : (
          <span className="aisle-shelf-view-cat aisle-shelf-view-cat--empty muted">No category</span>
        )}
      </div>
      <div className="aisle-shelf-view-products">
        {previewProducts.length ? (
          previewProducts.map((p) => (
            <span key={p.productId} className="aisle-shelf-view-product" title={p.name}>
              <ProductThumb product={p} size={26} />
              <span className="aisle-shelf-view-product-name">{p.name}</span>
            </span>
          ))
        ) : (
          <span className="muted aisle-shelf-view-empty">No products</span>
        )}
      </div>
      {onOpenPlanogram && !editDisabled ? (
        <span
          role="presentation"
          className="aisle-shelf-view-open-link"
          onClick={(e) => {
            e.stopPropagation();
            onOpenPlanogram(slot.shelfId);
          }}
        >
          Open planogram →
        </span>
      ) : null}
    </button>
  );
}

function OppositeStripCard({ slot, shelf, categories, products, selected, onSelect }) {
  const norm = shelf ? normalizeShelfUI(shelf) : null;
  const category = shelfStripCategory(norm, categories);
  const previewProducts = shelfStripProducts(norm, products, { max: 3 });
  const color = category ? colorForCategoryId(categories, category.id) : "#94a3b8";

  return (
    <button
      type="button"
      className={`aisle-shelf-view-card aisle-shelf-view-card--opposite${selected ? " is-selected" : ""}`}
      data-testid="aisle-shelf-opposite-card"
      data-shelf-label={slot.label}
      onClick={() => onSelect?.(slot.shelfId)}
    >
      <span className="aisle-shelf-view-label mono">{slot.label}</span>
      {category ? (
        <span className="aisle-shelf-view-cat aisle-shelf-view-cat--compact" style={{ color }}>
          {categoryLabel(categories, category.id)}
        </span>
      ) : null}
      <div className="aisle-shelf-view-products aisle-shelf-view-products--compact">
        {previewProducts.map((p) => (
          <ProductThumb key={p.productId} product={p} size={22} />
        ))}
      </div>
    </button>
  );
}

/** FR-VIEW-01 — flat aisle shelf strip (adjacent + opposite) without 3D navigation. */
export default function AisleShelfViewModal({
  open,
  shelfId,
  layout,
  products = [],
  categories = [],
  editDisabled = false,
  onClose,
  onSelectShelf,
  onOpenPlanogram,
}) {
  const scrollRef = useRef(null);
  const [activeShelfId, setActiveShelfId] = useStateFromProp(shelfId, open);

  const model = useMemo(
    () => (open && shelfId && layout ? buildAisleShelfView(layout, activeShelfId || shelfId) : null),
    [open, shelfId, layout, activeShelfId]
  );

  const shelvesById = useMemo(() => {
    const map = new Map();
    for (const s of layout?.shelves || layout?.fixtures || []) {
      if (s?.id) map.set(s.id, s);
    }
    return map;
  }, [layout]);

  useEffect(() => {
    if (!open || !model) return;
    const el = scrollRef.current?.querySelector(".aisle-shelf-view-card.is-selected");
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [open, model?.focusShelfId]);

  if (!open || !model) return null;

  function handleSelect(id) {
    setActiveShelfId(id);
    onSelectShelf?.(id);
  }

  return (
    <div
      className="modal-backdrop aisle-shelf-view-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="aisle-shelf-view-title"
      data-testid="aisle-shelf-view-modal"
      onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}
    >
      <div className="modal aisle-shelf-view-modal" onMouseDown={(e) => e.stopPropagation()}>
        <header className="aisle-shelf-view-header">
          <div>
            <h2 id="aisle-shelf-view-title" style={{ margin: 0, fontSize: 20 }}>
              Aisle {model.aisleLabel} — shelf view
            </h2>
            <p className="muted aisle-shelf-view-sub">
              Adjacent shelves along this aisle · selected <strong className="mono">{model.focusLabel}</strong>
            </p>
          </div>
          <button type="button" className="btn-secondary" onClick={() => onClose?.()}>
            Close
          </button>
        </header>

        <div className="aisle-shelf-view-body">
          <div className="aisle-shelf-view-row-label">This aisle</div>
          <div className="aisle-shelf-view-strip" ref={scrollRef} data-testid="aisle-shelf-strip">
            {model.slots.map((slot) => (
              <ShelfStripCard
                key={slot.shelfId}
                slot={slot}
                shelf={shelvesById.get(slot.shelfId)}
                categories={categories}
                products={products}
                selected={slot.shelfId === model.focusShelfId}
                onSelect={handleSelect}
                onOpenPlanogram={onOpenPlanogram}
                editDisabled={editDisabled}
              />
            ))}
          </div>

          {model.oppositeRows.map((row) => (
            <div key={row.aisleId} className="aisle-shelf-view-opposite-block">
              <div className="aisle-shelf-view-row-label">
                Facing aisle {row.aisleLabel}
                <span className="muted"> — across the gondola</span>
              </div>
              <div className="aisle-shelf-view-strip aisle-shelf-view-strip--opposite">
                {row.slots.map((slot) => (
                  <OppositeStripCard
                    key={slot.shelfId}
                    slot={slot}
                    shelf={shelvesById.get(slot.shelfId)}
                    categories={categories}
                    products={products}
                    selected={slot.shelfId === model.focusShelfId}
                    onSelect={handleSelect}
                  />
                ))}
              </div>
            </div>
          ))}

          {!model.oppositeRows.length ? (
            <p className="muted aisle-shelf-view-no-opposite">No opposite-aisle gondola faces on this run.</p>
          ) : null}
        </div>

        <footer className="aisle-shelf-view-footer muted">
          Scroll the strip to compare neighbouring shelves · click a card to focus it on the layout
        </footer>
      </div>
    </div>
  );
}

/** Keep local selection in sync when opening from a new shelf. */
function useStateFromProp(prop, open) {
  const [value, setValue] = useState(prop);
  useEffect(() => {
    if (open) setValue(prop);
  }, [prop, open]);
  return [value, setValue];
}
