"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";

export interface SearchSelectOption {
  value: string;
  label: string;
  /** Secondary text shown on the right of the option and also searched (e.g. a barcode). */
  hint?: string;
}

/**
 * A select you can type into: the input filters the options (case-insensitive
 * substring on label and hint) and the value is always one of the options' ids,
 * never free text. For lists too long for a plain <select> to scroll through.
 */
export function SearchSelect({
  options,
  value,
  onChange,
  placeholder,
  emptyText = "ไม่พบรายการ",
  ariaLabel,
  disabled = false,
}: {
  options: SearchSelectOption[];
  value: string | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  emptyText?: string;
  ariaLabel?: string;
  disabled?: boolean;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const selected = options.find((o) => o.value === value) ?? null;

  const matches = useMemo(() => {
    const n = query.trim().toLowerCase();
    if (!n) return options;
    return options.filter((o) => o.label.toLowerCase().includes(n) || o.hint?.toLowerCase().includes(n));
  }, [options, query]);

  // Close on a click anywhere outside.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Keep the keyboard-highlighted option in view.
  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const pick = (o: SearchSelectOption) => {
    onChange(o.value);
    setQuery("");
    setOpen(false);
  };

  const clear = () => {
    onChange(null);
    setQuery("");
    setActive(0);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) setOpen(true);
      else setActive((i) => Math.min(i + 1, matches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (open && matches[active]) {
        e.preventDefault();
        pick(matches[active]);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "Backspace" && !query && selected) {
      clear();
    }
  };

  const activeId = open && matches[active] ? `${listId}-${active}` : undefined;

  return (
    <div ref={rootRef} className="relative">
      <input
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={activeId}
        disabled={disabled}
        // Once chosen, the input shows the selection until the user starts typing again.
        value={open || !selected ? query : selected.label}
        placeholder={selected ? selected.label : placeholder}
        onFocus={() => {
          setOpen(true);
          setActive(0);
        }}
        onChange={(e) => {
          setQuery(e.target.value);
          setActive(0);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
        className={`w-full rounded-lg border border-line bg-bg py-2 pl-2.75 text-[13px] text-ink outline-none transition focus:border-teal disabled:opacity-45 ${
          selected ? "pr-8" : "pr-2.75"
        }`}
      />
      {selected && !disabled && (
        <button
          type="button"
          onClick={clear}
          aria-label="ล้างการเลือก"
          className="absolute right-1.5 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded text-muted hover:bg-bg-2 hover:text-ink"
        >
          ✕
        </button>
      )}
      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-30 mt-1 max-h-60 overflow-y-auto rounded-lg border border-line bg-panel py-1 shadow-card"
        >
          {matches.length === 0 && <li className="px-3 py-2.5 text-[12.5px] text-muted">{emptyText}</li>}
          {matches.map((o, i) => (
            <li
              key={o.value}
              id={`${listId}-${i}`}
              data-index={i}
              role="option"
              aria-selected={o.value === value}
              // mousedown, not click: fires before the input's blur so the pick isn't lost
              onMouseDown={(e) => {
                e.preventDefault();
                pick(o);
              }}
              onMouseEnter={() => setActive(i)}
              className={`flex cursor-pointer items-center justify-between gap-3 px-3 py-2 text-[13px] ${
                i === active ? "bg-bg" : ""
              } ${o.value === value ? "font-medium text-teal-d" : "text-ink"}`}
            >
              <span className="truncate">{o.label}</span>
              {o.hint && <span className="flex-none font-mono text-[11px] text-muted">{o.hint}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
