/** Dismissible inline alert for errors, warnings, and info. */
export default function AlertBanner({
  variant = "error",
  title,
  children,
  onDismiss,
  className = "",
  role = "alert",
  ...rest
}) {
  const text = children ?? title;
  if (!text) return null;

  return (
    <div
      className={`alert-banner alert-banner--${variant} ${className}`.trim()}
      role={role}
      {...rest}
    >
      <span className="alert-banner-icon" aria-hidden>
        {variant === "error" ? "!" : variant === "warning" ? "⚠" : variant === "success" ? "✓" : "ℹ"}
      </span>
      <div className="alert-banner-body">
        {title && children ? <strong className="alert-banner-title">{title}</strong> : null}
        <span>{children ?? title}</span>
      </div>
      {onDismiss ? (
        <button
          type="button"
          className="alert-banner-dismiss"
          aria-label="Dismiss"
          onClick={(e) => {
            e.stopPropagation();
            onDismiss();
          }}
        >
          ×
        </button>
      ) : null}
    </div>
  );
}
