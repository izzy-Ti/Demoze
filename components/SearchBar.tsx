"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { useSearch } from "./useSearch";
import { SearchIcon } from "./CommandPalette";

/**
 * Search box with instant results. Still a plain GET form to /search,
 * so it works before JavaScript loads and on slow connections.
 */
export function SearchBar({
  placeholder,
  button,
  groups,
  defaultValue = "",
  size = "lg",
  autoFocus,
}: {
  placeholder: string;
  button: string;
  groups: { companies: string; jobs: string };
  defaultValue?: string;
  size?: "lg" | "md";
  autoFocus?: boolean;
}) {
  const id = useId();
  const router = useRouter();
  const [q, setQ] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const { results, flat } = useSearch(open ? q : "");
  const show = open && flat.length > 0;

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!show) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(flat.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(-1, a - 1));
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault();
      router.push(flat[active]!.href);
    } else if (e.key === "Escape") setOpen(false);
  }

  let i = -1;
  const group = (label: string, list: typeof flat) =>
    list.length > 0 && (
      <li role="presentation">
        <p className="px-3 pb-1 pt-2 text-xs font-medium text-fg-subtle">{label}</p>
        <ul role="group">
          {list.map((hit) => {
            i++;
            const idx = i;
            return (
              <li
                key={hit.href}
                id={`${id}-${idx}`}
                role="option"
                aria-selected={idx === active}
                onMouseDown={(e) => {
                  e.preventDefault();
                  router.push(hit.href);
                }}
                onMouseMove={() => setActive(idx)}
                className={`flex cursor-pointer items-center justify-between gap-3 rounded-md px-3 py-2.5 text-sm ${idx === active ? "bg-bg-muted" : ""}`}
              >
                <span className="truncate font-medium">{hit.label}</span>
                <span className="num text-xs text-fg-subtle">{hit.count}</span>
              </li>
            );
          })}
        </ul>
      </li>
    );

  const h = size === "lg" ? "h-14" : "h-12";
  return (
    <form action="/search" method="get" role="search" className="relative w-full">
      <div className={`flex ${h} items-center gap-2 rounded-xl border border-border-strong bg-bg pl-4 pr-1.5 shadow-sm transition-shadow focus-within:border-accent focus-within:shadow-[0_0_0_4px_var(--ring)]`}>
        <SearchIcon className="h-5 w-5 text-fg-subtle" />
        <label htmlFor={id} className="sr-only">{placeholder}</label>
        <input
          id={id}
          name="q"
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          autoFocus={autoFocus}
          maxLength={100}
          role="combobox"
          aria-expanded={show}
          aria-controls={`${id}-list`}
          aria-activedescendant={active >= 0 ? `${id}-${active}` : undefined}
          className="h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-fg-subtle [&::-webkit-search-cancel-button]:hidden"
        />
        <button type="submit" className={`btn-primary ${size === "lg" ? "h-11" : "h-9"} px-5`}>{button}</button>
      </div>
      {show && (
        <ul id={`${id}-list`} role="listbox" className="absolute inset-x-0 top-full z-30 mt-2 max-h-80 overflow-y-auto rounded-xl border border-border bg-bg p-1.5 shadow-xl">
          {group(groups.companies, results.companies)}
          {group(groups.jobs, results.titles)}
        </ul>
      )}
    </form>
  );
}
