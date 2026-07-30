import { useRef } from "react";

/** Typeahead + Enter/blur go-to for aisle shelf labels (e.g. 4A). */
export default function ShelfGotoInput({ options = [], onGo, disabled, listId = "shelf-goto-list", className = "" }) {
  const inputRef = useRef(null);

  function tryGo(raw) {
    const label = String(raw || "").trim();
    if (!label) return;
    onGo?.(label);
    if (inputRef.current) inputRef.current.value = "";
  }

  function onInputCommit(e) {
    const value = e.currentTarget.value;
    const exact = options.find((o) => o.label.toUpperCase() === value.trim().toUpperCase());
    if (exact) tryGo(exact.label);
  }

  return (
    <div className={`shelf-goto-wrap${className ? ` ${className}` : ""}`} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
      <input
        ref={inputRef}
        className="mono shelf-goto-input"
        list={listId}
        placeholder="Go to shelf…"
        title="Type aisle label e.g. 4A, then Enter or Go"
        disabled={disabled}
        style={{
          padding: "6px 10px",
          borderRadius: 8,
          border: "1px solid #e5e7eb",
          fontSize: 12,
          width: 108,
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            tryGo(e.currentTarget.value);
            e.currentTarget.blur();
          }
        }}
        onChange={onInputCommit}
      />
      {options.length > 0 ? (
        <datalist id={listId}>
          {options.map((o) => (
            <option key={o.label} value={o.label} />
          ))}
        </datalist>
      ) : null}
      <button
        type="button"
        className="btn-secondary shelf-goto-btn"
        style={{ padding: "6px 10px", fontSize: 12, lineHeight: 1.2 }}
        disabled={disabled}
        title="Go to typed shelf"
        onClick={() => tryGo(inputRef.current?.value)}
      >
        Go
      </button>
    </div>
  );
}
