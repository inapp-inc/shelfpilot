import { useCallback, useRef, useState } from "react";
import {
  ANALYTICS_MAX_WIDGET_HEIGHT,
  ANALYTICS_MIN_WIDGET_HEIGHT,
  estimateGridColumnWidth,
  snapColumnSpan,
} from "./analyticsWidgets.js";

/** Removable, resizable analytics panel wrapper. */
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

    const colWidth = estimateGridColumnWidth(grid, gridMode === "kpi" ? 140 : 300);
    const finalWidth = Math.max(colWidth, drag.startWidth + drag.deltaX);
    const nextColSpan = snapColumnSpan(finalWidth, colWidth, gridMode);
    const nextHeight = Math.min(
      ANALYTICS_MAX_WIDGET_HEIGHT,
      Math.max(ANALYTICS_MIN_WIDGET_HEIGHT, drag.startHeight + drag.deltaY)
    );

    onSizeChange?.(widget.id, {
      colSpan: gridMode === "kpi" && nextColSpan === "full" ? 2 : nextColSpan,
      height: nextHeight,
    });
    if (card) card.style.minHeight = "";
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
      card.style.minHeight = `${nextHeight}px`;
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

  const onResizePointerCancel = useCallback(
    (event) => {
      const drag = dragRef.current;
      if (!drag || drag.pointerId !== event.pointerId) return;
      dragRef.current = null;
      setResizing(false);
      document.body.classList.remove("analytics-widget-resize-active");
    },
    []
  );

  const onResizeDoubleClick = useCallback(
    (event) => {
      event.preventDefault();
      event.stopPropagation();
      onSizeChange?.(widget.id, {
        colSpan: gridMode === "kpi" ? (colSpan === 2 ? 1 : 2) : isFull ? 1 : colSpan === 2 ? "full" : 2,
        height: null,
      });
    },
    [colSpan, gridMode, isFull, onSizeChange, widget.id]
  );

  return (
    <div
      ref={cardRef}
      className={`analytics-widget panel${kpi ? " analytics-widget--kpi kpi-card analytics-kpi" : ""}${isFull ? " analytics-widget--wide" : ""}${resizing ? " analytics-widget--resizing" : ""}${className ? ` ${className}` : ""}`}
      data-widget-id={widget.id}
      style={{
        gridColumn: gridColumnStyle,
        minHeight: height ? `${height}px` : undefined,
      }}
    >
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
        title="Drag to resize · double-click to reset"
        onPointerDown={onResizePointerDown}
        onPointerMove={onResizePointerMove}
        onPointerUp={onResizePointerUp}
        onPointerCancel={onResizePointerCancel}
        onDoubleClick={onResizeDoubleClick}
      />
    </div>
  );
}
