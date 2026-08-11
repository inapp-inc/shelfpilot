import { useEffect, useId, useMemo, useRef, useState } from "react";

/** Text input with filtered dropdown — for long product/category lists. */
export default function SearchableSelect({
  options = [],
  value = "",
  onChange,
  disabled = false,
  placeholder = "Search…",
  emptyLabel = "No matches",
  noneLabel = "Select…",
  id: idProp,
  className = "",
}) {
  const autoId = useId();
  const id = idProp || autoId;
  const listId = `${id}-list`;
  const wrapRef = useRef(null);
  const inputRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const selectedOption = useMemo(
    () => options.find((o) => o.value === value) || null,
    [options, value]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => {
      const hay = `${o.label} ${o.searchText || ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [options, query]);

  useEffect(() => {
    if (!open) return;
    function onDoc(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setQuery("");
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  function selectOption(opt) {
    onChange?.(opt?.value ?? "");
    setOpen(false);
    setQuery("");
    inputRef.current?.blur();
  }

  const displayValue = open ? query : selectedOption?.label || "";

  return (
    <div
      ref={wrapRef}
      className={`searchable-select${open ? " is-open" : ""}${disabled ? " is-disabled" : ""}${className ? ` ${className}` : ""}`}
    >
      <input
        ref={inputRef}
        id={id}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        disabled={disabled}
        placeholder={selectedOption ? undefined : noneLabel}
        title={selectedOption?.label || noneLabel}
        value={displayValue}
        onFocus={() => {
          if (disabled) return;
          setOpen(true);
          setQuery("");
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
          if (!e.target.value.trim()) onChange?.("");
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setOpen(false);
            setQuery("");
            inputRef.current?.blur();
          } else if (e.key === "Enter" && filtered.length === 1) {
            e.preventDefault();
            selectOption(filtered[0]);
          } else if (e.key === "ArrowDown" && !open) {
            setOpen(true);
          }
        }}
      />
      {open && !disabled ? (
        <ul id={listId} className="searchable-select-list" role="listbox">
          {filtered.length === 0 ? (
            <li className="searchable-select-empty muted">{emptyLabel}</li>
          ) : (
            filtered.slice(0, 200).map((opt) => (
              <li
                key={opt.value}
                role="option"
                aria-selected={opt.value === value}
                className={`searchable-select-option${opt.value === value ? " is-selected" : ""}`}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectOption(opt);
                }}
              >
                {opt.label}
              </li>
            ))
          )}
          {filtered.length > 200 ? (
            <li className="searchable-select-more muted">…{filtered.length - 200} more — refine search</li>
          ) : null}
        </ul>
      ) : null}
    </div>
  );
}
