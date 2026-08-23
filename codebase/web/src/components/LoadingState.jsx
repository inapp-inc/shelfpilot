/** Shared API / route loading indicator. */
export default function LoadingState({
  label = "Loading…",
  size = "md",
  variant = "block",
  className = "",
}) {
  const rootClass = [
    "loading-state",
    `loading-state--${size}`,
    `loading-state--${variant}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={rootClass} role="status" aria-live="polite" aria-busy="true">
      <span className="loading-state-spinner" aria-hidden />
      {label ? <span className="loading-state-label">{label}</span> : null}
    </div>
  );
}
