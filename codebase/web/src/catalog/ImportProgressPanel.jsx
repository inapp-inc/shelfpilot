/** Inline import progress panel for Excel catalog import. */
export default function ImportProgressPanel({ progress }) {
  if (!progress) return null;

  const done = progress.phase === "done";
  const error = progress.phase === "error";

  return (
    <div
      className={`import-progress-panel ${done ? "import-progress-done" : ""} ${error ? "import-progress-error" : ""}`}
      role="status"
      aria-live="polite"
    >
      <div className="import-progress-header">
        <strong>{error ? "Import failed" : done ? "Import complete" : "Importing…"}</strong>
        {!error && !done ? <span className="spin import-progress-spin" aria-hidden /> : null}
        {done ? <span className="import-progress-check">✓</span> : null}
      </div>
      <p className="import-progress-message">{progress.message}</p>
      {progress.detail ? (
        <p className="import-progress-detail mono">{progress.detail}</p>
      ) : null}
      {!error ? (
        <div className="import-progress-track">
          <div className="import-progress-fill" style={{ width: `${Math.min(100, progress.percent || 0)}%` }} />
        </div>
      ) : null}
    </div>
  );
}
