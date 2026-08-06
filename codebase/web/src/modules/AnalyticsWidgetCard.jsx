import { useCallback, useRef, useState } from "react";
import WidgetInfoTip from "./WidgetInfoTip.jsx";
import {
  ANALYTICS_GRID_MIN_COL_PX,
  ANALYTICS_MAX_WIDGET_HEIGHT,
  ANALYTICS_MIN_WIDGET_HEIGHT,
  ANALYTICS_MIN_WIDGET_WIDTH,
  defaultWidgetSize,
  estimateGridColumnWidth,
  snapColumnSpan,
} from "./analyticsWidgets.js";
import { drillDownForWidget, drillDownHint } from "./dashboardDrillDown.js";

/** Removable, resizable, reorderable analytics panel wrapper. */
export default function AnalyticsWidgetCard({
  widget,
  size,
  gridMode = "report",
  gridRef,
  onRemove,
  onSizeChange,
  children,
  className = "",
  kpi = false,
  description,
  enableReorder = false,
  isDragOver = false,
  isDragging = false,
  onDragHandleStart,
  onDragEnd,
  onDragOver,
  onDragLeave,
  onDrop,
  onDrillDown,
  canEditLayout = true,
}) {
  const cardRef = useRef(null);
  const [resizing, setResizing] = useState(false);
  const dragRef = useRef(null);

  const colSpan = size?.colSpan ?? 1;
  const height = size?.height ?? null;
  const isFull = colSpan === "full";

  const gridColumnStyle =
    gridMode === "kpi"
      ? colSpan === 2
        ? "span 2"
        : undefined
      : isFull
        ? "1 / -1"
        : colSpan === 2
          ? "span 2"
          : undefined;

  const finishResize = useCallback(() => {
    const drag = dragRef.current;
    dragRef.current = null;
    setResizing(false);
    document.body.classList.remove("analytics-widget-resize-active");
    if (!drag) return;

    const card = cardRef.current;
    const grid = gridRef?.current;
    if (!card) return;

    const colWidth = estimateGridColumnWidth(grid, ANALYTICS_GRID_MIN_COL_PX);
    const finalWidth = Math.max(ANALYTICS_MIN_WIDGET_WIDTH, drag.startWidth + drag.deltaX);
    const nextColSpan = snapColumnSpan(finalWidth, colWidth, gridMode);
    const rawHeight = drag.startHeight + drag.deltaY;
    const nextHeight =
      rawHeight < ANALYTICS_MIN_WIDGET_HEIGHT - 8
        ? null
        : Math.min(ANALYTICS_MAX_WIDGET_HEIGHT, Math.max(ANALYTICS_MIN_WIDGET_HEIGHT, rawHeight));

    onSizeChange?.(widget.id, {
      colSpan: gridMode === "kpi" && nextColSpan === "full" ? 2 : nextColSpan,
      height: nextHeight,
    });
    card.style.height = "";
    card.style.minHeight = "";
  }, [gridMode, gridRef, onSizeChange, widget.id]);

  const onResizePointerDown = useCallback(
    (event) => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.stopPropagation();

      const card = cardRef.current;
      if (!card) return;

      dragRef.current = {
        pointerId: event.pointerId,
        startX: event.clientX,
        startY: event.clientY,
        startWidth: card.offsetWidth,
        startHeight: height ?? card.offsetHeight,
        deltaX: 0,
        deltaY: 0,
      };
      setResizing(true);
      document.body.classList.add("analytics-widget-resize-active");
      event.currentTarget.setPointerCapture(event.pointerId);
    },
    [height]
  );

  const onResizePointerMove = useCallback((event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    drag.deltaX = event.clientX - drag.startX;
    drag.deltaY = event.clientY - drag.startY;
    const card = cardRef.current;
    if (card) {
      const nextHeight = Math.min(
        ANALYTICS_MAX_WIDGET_HEIGHT,
        Math.max(ANALYTICS_MIN_WIDGET_HEIGHT, drag.startHeight + drag.deltaY)
      );
      card.style.height = `${nextHeight}px`;
      card.style.minHeight = "0";
    }
  }, []);

  const onResizePointerUp = useCallback(
    (event) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      try {
        event.currentTarget.releasePointerCapture(event.pointerId);
      } catch {
        /* ignore */
      }
      finishResize();
    },
    [finishResize]
  );

  const onResizePointerCancel = useCallback((event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setResizing(false);
    document.body.classList.remove("analytics-widget-resize-active");
    const card = cardRef.current;
    if (card) {
      card.style.height = "";
      card.style.minHeight = "";
    }
  }, []);

  const onResizeDoubleClick = useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      onSizeChange?.(widget.id, defaultWidgetSize(widget));
      const card = cardRef.current;
      if (card) {
        card.style.height = "";
        card.style.minHeight = "";
      }
    },
    [onSizeChange, widget]
  );

  const handleDragStart = useCallback(
    (event) => {
      if (!enableReorder) return;
      event.stopPropagation();
      onDragHandleStart?.(event, widget.id);
    },
    [enableReorder, onDragHandleStart, widget.id]
  );

  const drillDown = drillDownForWidget(widget);
  const drillHint = drillDownHint(drillDown, { canEditLayout });

  const handleCardClick = useCallback(
    (event) => {
      if (!drillDown || !onDrillDown) return;
      if (
        event.target.closest(
          ".analytics-widget-remove, .analytics-widget-drag, .analytics-widget-resize, .widget-info-icon-btn, button, select, a, input, textarea"
        )
      ) {
        return;
      }
      onDrillDown(drillDown, widget);
    },
    [drillDown, onDrillDown, widget]
  );

  return (
    <div
      ref={cardRef}
      className={`analytics-widget panel${kpi ? " analytics-widget--kpi kpi-card analytics-kpi" : ""}${isFull ? " analytics-widget--wide" : ""}${resizing ? " analytics-widget--resizing" : ""}${isDragOver ? " analytics-widget--drag-over" : ""}${isDragging ? " analytics-widget--dragging" : ""}${drillDown && onDrillDown ? " analytics-widget--drillable" : ""}${className ? ` ${className}` : ""}`}
      data-widget-id={widget.id}
      data-testid={`analytics-widget-${widget.id}`}
      style={{
        gridColumn: gridColumnStyle,
        height: height ? `${height}px` : undefined,
      }}
      onClick={drillDown && onDrillDown ? handleCardClick : undefined}
      onKeyDown={
        drillDown && onDrillDown
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onDrillDown(drillDown, widget);
              }
            }
          : undefined
      }
      role={drillDown && onDrillDown ? "button" : undefined}
      tabIndex={drillDown && onDrillDown ? 0 : undefined}
      title={drillHint || undefined}
      onDragOver={enableReorder ? onDragOver : undefined}
      onDragLeave={enableReorder ? onDragLeave : undefined}
      onDrop={enableReorder ? onDrop : undefined}
    >
      <div className="analytics-widget-head">
        {enableReorder ? (
          <span
            className="analytics-widget-drag"
            draggable
            title="Drag to reorder"
            aria-label={`Drag to reorder ${widget.label}`}
            onDragStart={handleDragStart}
            onDragEnd={onDragEnd}
          >
            ⠿
          </span>
        ) : null}
        <span className="analytics-widget-title">{widget.label}</span>
        <WidgetInfoTip text={description || widget.description} label={widget.label} />
      </div>
      <button
        type="button"
        className="analytics-widget-remove"
        onClick={() => onRemove(widget.id)}
        title={`Hide ${widget.label}`}
        aria-label={`Hide ${widget.label}`}
      >
        ×
      </button>
      <div className="analytics-widget-body">{children}</div>
      <div
        className="analytics-widget-resize"
        role="separator"
        aria-orientation="both"
        aria-label={`Resize ${widget.label}`}
        title="Drag to resize · double-click corner to reset"
        onPointerDown={onResizePointerDown}
        onPointerMove={onResizePointerMove}
        onPointerUp={onResizePointerUp}
        onPointerCancel={onResizePointerCancel}
        onDoubleClick={onResizeDoubleClick}
      />
    </div>
  );
}
