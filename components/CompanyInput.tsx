"use client";

import { useEffect, useId, useRef, useState } from "react";

type Suggestion = { name: string; slug: string };

/** Company field with suggestions of existing companies, to prevent duplicates. */
export function CompanyInput({
  name,
  label,
  hint,
  suggestionsLabel,
  defaultValue = "",
  error,
}: {
  name: string;
  label: string;
  hint: string;
  suggestionsLabel: string;
  defaultValue?: string;
  error?: string;
}) {
  const id = useId();
  const [value, setValue] = useState(defaultValue);
  const [items, setItems] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const skipFetch = useRef(false);

  useEffect(() => {
    if (skipFetch.current) {
      skipFetch.current = false;
      return;
    }
    const q = value.trim();
    if (q.length < 2) {
      setItems([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/companies?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        if (!res.ok) return;
        const data = (await res.json()) as { companies: Suggestion[] };
        setItems(data.companies);
        setActive(-1);
        setOpen(true);
      } catch {
        /* aborted or offline: suggestions are optional */
      }
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [value]);

  function choose(s: Suggestion) {
    skipFetch.current = true;
    setValue(s.name);
    setOpen(false);
    setItems([]);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || items.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => (a + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => (a <= 0 ? items.length - 1 : a - 1));
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      choose(items[active]!);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const listId = `${id}-list`;
  const showList = open && items.length > 0;

  return (
    <div className="relative">
      <label htmlFor={id} className="label">{label}</label>
      <input
        id={id}
        name={name}
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          setOpen(true);
        }}
        onKeyDown={onKeyDown}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        required
        maxLength={120}
        autoComplete="off"
        role="combobox"
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={active >= 0 ? `${listId}-${active}` : undefined}
        aria-invalid={!!error}
        aria-describedby={`${id}-hint${error ? ` ${id}-error` : ""}`}
        className="input"
      />
      <p id={`${id}-hint`} className="hint">{hint}</p>
      {error && <p id={`${id}-error`} className="field-error">{error}</p>}
      {showList && (
        <ul
          id={listId}
          role="listbox"
          aria-label={suggestionsLabel}
          className="absolute z-30 mt-1.5 max-h-64 w-full overflow-auto rounded-lg border border-border bg-bg p-1 shadow-xl"
        >
          {items.map((s, i) => (
            <li
              key={s.slug}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(s);
              }}
              className={`flex cursor-pointer items-center rounded-md px-3 py-2 text-sm font-medium ${i === active ? "bg-bg-muted" : "hover:bg-bg-muted"}`}
            >
              {s.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
