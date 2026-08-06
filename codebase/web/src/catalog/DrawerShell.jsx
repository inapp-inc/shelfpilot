/** Slide-over drawer shell. */
export default function DrawerShell({ title, open, onClose, children, footer }) {
  if (!open) return null;
  return (
    <div className="drawer-backdrop" onClick={onClose} data-testid="drawer-backdrop">
      <div className="drawer-panel" onClick={(e) => e.stopPropagation()} data-testid="drawer-panel">
        <div className="drawer-header">
          <h3 data-testid="drawer-title">{title}</h3>
          <button type="button" className="drawer-close" data-testid="drawer-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="drawer-body">{children}</div>
        {footer ? <div className="drawer-footer" data-testid="drawer-footer">{footer}</div> : null}
      </div>
    </div>
  );
}
