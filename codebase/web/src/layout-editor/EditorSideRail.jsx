import { useEffect, useState } from "react";
import PropertiesPanel from "./PropertiesPanel.jsx";
import MerchandisingPanel from "./MerchandisingPanel.jsx";
import MissingProductsPanel from "./MissingProductsPanel.jsx";
import ShelfNumberLegend from "./ShelfNumberLegend.jsx";
import ZonesEntryPanel from "./ZonesEntryPanel.jsx";

/** Tabbed right rail: Properties | Merchandising | Zones. */
export default function EditorSideRail({
  selection,
  layout,
  editDisabled,
  minAisle,
  verticalLabel,
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
  onRefreshCatalog,
  onOpenPlanogram,
  toast,
  planogramCoverage,
  coverageLoading,
  onRefreshCoverage,
}) {
  const [tab, setTab] = useState("merch");

  // Jump to the right tab based on what is selected on the canvas.
  useEffect(() => {
    if (selection?.kind === "zone" || selection?.kind === "entryPoint") setTab("zones");
    else if (selection?.kind === "aisle") setTab("props");
    else if (selection?.kind === "shelf" || selection?.kind === "fixture") setTab("merch");
  }, [selection?.kind, selection?.id]);

  return (
    <div className="props-col editor-side-rail">
      <div className="mode-toggle editor-rail-tabs">
        <button type="button" className={tab === "props" ? "active" : ""} onClick={() => setTab("props")}>
          Properties
        </button>
        <button type="button" className={tab === "merch" ? "active" : ""} onClick={() => setTab("merch")}>
          Merchandising
        </button>
        <button type="button" className={tab === "zones" ? "active" : ""} onClick={() => setTab("zones")}>
          Zones
        </button>
      </div>
      <div className="editor-rail-body">
        {tab === "zones" ? (
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
            />
            <MissingProductsPanel
              coverage={planogramCoverage}
              loading={coverageLoading}
              onRefresh={onRefreshCoverage}
              categories={categories}
            />
            <ShelfNumberLegend layout={layout} categories={categories} />
          </>
        )}
      </div>
    </div>
  );
}
