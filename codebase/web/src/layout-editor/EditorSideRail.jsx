import { useEffect, useState } from "react";
import PropertiesPanel from "./PropertiesPanel.jsx";
import MerchandisingPanel from "./MerchandisingPanel.jsx";
import ShelfNumberLegend from "./ShelfNumberLegend.jsx";
import ZonesEntryPanel from "./ZonesEntryPanel.jsx";
import FloorPlanPanel from "./FloorPlanPanel.jsx";

/** Tabbed right rail: Properties | Merchandising | Zones | Floor plan. */
export default function EditorSideRail({
  selection,
  layout,
  editDisabled,
  minAisle,
  verticalLabel,
  storeTypeLabel,
  storeTypeEmoji,
  fixtureTypes = [],
  categories,
  products,
  token,
  onPatchAisle,
  onPatchShelf,
  onDeleteAisle,
  onDeleteShelf,
  onMapAisle,
  onMapShelf,
  onLayoutUpdated,
  onQuickAddProduct,
  onPatchZone,
  onDeleteZone,
  onPatchEntry,
  onDeleteEntry,
  onSelectZone,
  onUploadFloorPlan,
  onPatchFloorPlan,
  onRemoveFloorPlan,
  onPatchObstacle,
  onDeleteObstacle,
  onSelectObstacle,
  onRefreshCatalog,
  onOpenPlanogram,
  toast,
  planogramCoverage,
  coverageLoading,
  onOpenMissingProducts,
  onGoToShelf,
  selectedShelfId,
  onShelfFaceChange,
  merchTabFocus = 0,
}) {
  const [tab, setTab] = useState("merch");

  // Jump to the right tab based on what is selected on the canvas.
  useEffect(() => {
    if (selection?.kind === "zone" || selection?.kind === "entryPoint") setTab("zones");
    else if (selection?.kind === "obstacle") setTab("floor");
    else if (selection?.kind === "aisle") setTab("props");
    else if (selection?.kind === "shelf" || selection?.kind === "fixture") setTab("props");
  }, [selection?.kind, selection?.id]);

  useEffect(() => {
    if (merchTabFocus > 0) setTab("merch");
  }, [merchTabFocus]);

  return (
    <div className="props-col editor-side-rail">
      <div className="mode-toggle editor-rail-tabs">
        <button type="button" className={tab === "props" ? "active" : ""} onClick={() => setTab("props")}>
          Props
        </button>
        <button type="button" className={tab === "merch" ? "active" : ""} onClick={() => setTab("merch")}>
          Merch
        </button>
        <button type="button" className={tab === "zones" ? "active" : ""} onClick={() => setTab("zones")}>
          Zones
        </button>
        <button type="button" className={tab === "floor" ? "active" : ""} onClick={() => setTab("floor")}>
          Floor
        </button>
      </div>
      <div className="editor-rail-body">
        {tab === "floor" ? (
          <FloorPlanPanel
            layout={layout}
            editDisabled={editDisabled}
            selection={selection}
            onUploadFloorPlan={onUploadFloorPlan}
            onPatchFloorPlan={onPatchFloorPlan}
            onRemoveFloorPlan={onRemoveFloorPlan}
            onPatchObstacle={onPatchObstacle}
            onDeleteObstacle={onDeleteObstacle}
            onSelectObstacle={onSelectObstacle}
          />
        ) : tab === "zones" ? (
          <ZonesEntryPanel
            layout={layout}
            editDisabled={editDisabled}
            selection={selection}
            onPatchZone={onPatchZone}
            onDeleteZone={onDeleteZone}
            onPatchEntry={onPatchEntry}
            onDeleteEntry={onDeleteEntry}
            onSelectZone={onSelectZone}
          />
        ) : tab === "props" ? (
          <PropertiesPanel
            selection={selection}
            layout={layout}
            editDisabled={editDisabled}
            minAisle={minAisle}
            verticalLabel={verticalLabel}
            storeTypeLabel={storeTypeLabel}
            storeTypeEmoji={storeTypeEmoji}
            fixtureTypes={fixtureTypes}
            onPatchAisle={onPatchAisle}
            onPatchShelf={onPatchShelf}
            onDeleteAisle={onDeleteAisle}
            onDeleteShelf={onDeleteShelf}
            onOpenPlanogram={onOpenPlanogram}
          />
        ) : (
          <>
            <MerchandisingPanel
              selection={selection}
              layout={layout}
              token={token}
              products={products}
              categories={categories}
              editDisabled={editDisabled}
              onLayoutUpdated={onLayoutUpdated}
              onMapAisle={onMapAisle}
              onMapShelf={onMapShelf}
              onQuickAddProduct={onQuickAddProduct}
              onRefreshCatalog={onRefreshCatalog}
              onOpenPlanogram={onOpenPlanogram}
              toast={toast}
              onShelfFaceChange={onShelfFaceChange}
            />
            <details className="editor-rail-details">
              <summary>Shelf map</summary>
              {planogramCoverage?.missingCount > 0 && onOpenMissingProducts ? (
                <button
                  type="button"
                  className="btn-secondary editor-rail-missing-link"
                  onClick={onOpenMissingProducts}
                >
                  View missing products ({planogramCoverage.missingCount})
                </button>
              ) : planogramCoverage && !coverageLoading && planogramCoverage.missingCount === 0 ? (
                <p className="muted" style={{ fontSize: 12, margin: "0 0 10px" }}>
                  All catalog products are placed on shelves.
                </p>
              ) : null}
              <ShelfNumberLegend
                layout={layout}
                categories={categories}
                onGoToShelf={onGoToShelf}
                selectedShelfId={selectedShelfId}
              />
            </details>
          </>
        )}
      </div>
    </div>
  );
}
