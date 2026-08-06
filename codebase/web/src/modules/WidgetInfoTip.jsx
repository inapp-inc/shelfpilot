import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

const TIP_WIDTH = 280;
const VIEWPORT_PAD = 10;

/** Info icon with body-portal tooltip — avoids clipping inside overflow:hidden widgets. */
export default function WidgetInfoTip({ text, label = "About this widget" }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const tipRef = useRef(null);
  const tipId = useId();

  const updatePosition = useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger) return;

    const rect = trigger.getBoundingClientRect();
    const tipEl = tipRef.current;
    const tipHeight = tipEl?.offsetHeight ?? 72;
    const tipWidth = Math.min(TIP_WIDTH, window.innerWidth - VIEWPORT_PAD * 2);

    let top = rect.bottom + 8;
    if (top + tipHeight > window.innerHeight - VIEWPORT_PAD) {
      top = Math.max(VIEWPORT_PAD, rect.top - tipHeight - 8);
    }

    let left = rect.left + rect.width / 2 - tipWidth / 2;
    left = Math.max(VIEWPORT_PAD, Math.min(left, window.innerWidth - tipWidth - VIEWPORT_PAD));

    setPos({ top, left, width: tipWidth });
  }, []);

  const show = useCallback(() => {
    setOpen(true);
    requestAnimationFrame(updatePosition);
  }, [updatePosition]);

  const hide = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return undefined;
    updatePosition();
    const onReflow = () => updatePosition();
    window.addEventListener("scroll", onReflow, true);
    window.addEventListener("resize", onReflow);
    return () => {
      window.removeEventListener("scroll", onReflow, true);
      window.removeEventListener("resize", onReflow);
    };
  }, [open, updatePosition]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") hide();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, hide]);

  if (!text) return null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="widget-info-icon-btn"
        aria-label={`${label}. ${text}`}
        aria-expanded={open}
        aria-describedby={open ? tipId : undefined}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
        onClick={(e) => {
          e.stopPropagation();
          if (open) hide();
          else show();
        }}
      >
        <span className="widget-info-icon" aria-hidden="true">
          i
        </span>
      </button>
      {open
        ? createPortal(
            <div
              ref={tipRef}
              id={tipId}
              role="tooltip"
              className="widget-info-portal"
              style={{ top: pos.top, left: pos.left, width: pos.width }}
              onMouseEnter={show}
              onMouseLeave={hide}
            >
              {text}
            </div>,
            document.body
          )
        : null}
    </>
  );
}
