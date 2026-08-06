/** Collapsible chrome for left/right layout editor panels. */
export default function EditorPanelShell({ side, label, collapsed, onToggleCollapse, children }) {
  const expandIcon = side === "left" ? "›" : "‹";
  const collapseIcon = side === "left" ? "‹" : "›";

  if (collapsed) {
    return (
      <aside
        className={`editor-side-panel editor-side-panel--${side} is-collapsed`}
        aria-label={label}
        data-testid={`editor-panel-${side}-collapsed`}
      >
        <button
          type="button"
          className="editor-panel-toggle"
          data-testid={`editor-panel-${side}-expand`}
          onClick={onToggleCollapse}
          title={`Expand ${label}`}
          aria-expanded={false}
          aria-label={`Expand ${label}`}
        >
          <span aria-hidden>{expandIcon}</span>
        </button>
        <span className="editor-panel-collapsed-label">{label}</span>
      </aside>
    );
  }

  return (
    <aside
      className={`editor-side-panel editor-side-panel--${side}`}
      aria-label={label}
      data-testid={`editor-panel-${side}`}
    >
      <div className="editor-panel-header">
        <span className="editor-panel-title">{label}</span>
        <button
          type="button"
          className="editor-panel-toggle"
          data-testid={`editor-panel-${side}-collapse`}
          onClick={onToggleCollapse}
          title={`Collapse ${label}`}
          aria-expanded
          aria-label={`Collapse ${label}`}
        >
          <span aria-hidden>{collapseIcon}</span>
        </button>
      </div>
      <div className="editor-panel-content">{children}</div>
    </aside>
  );
}
