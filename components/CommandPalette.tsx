"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Dictionary } from "@/lib/i18n";
import { useSearch, type SearchHit } from "./useSearch";

type QuickLink = { href: string; label: string };

/** ⌘K / Ctrl+K / "/" search across companies and job titles. */
export function CommandPalette({
  t,
  hint,
  label,
  quickLinks,
}: {
  t: Dictionary["palette"];
  hint: string;
  label: string;
  quickLinks: QuickLink[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const [mac, setMac] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const { results, loading, flat } = useSearch(open ? query : "");

  const showQuick = query.trim().length < 2;
  const items: SearchHit[] = showQuick ? quickLinks.map((l) => ({ ...l, count: -1 })) : flat;

  const close = useCallback(() => {
    setOpen(false);
    setQuery("");
    setActive(0);
  }, []);

  useEffect(() => {
    setMac(/Mac|iPhone|iPad/.test(navigator.platform));
    function onKey(e: KeyboardEvent) {
      const typing = e.target instanceof HTMLElement && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName);
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !typing)) {
        e.preventDefault();
        setOpen(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (open) requestAnimationFrame(() => inputRef.current?.focus());
    document.body.style.overflow = open ? "hidden" : "";
  }, [open]);

  useEffect(() => setActive(0), [query, results]);

  function go(href: string) {
    close();
    router.push(href);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") return close();
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(items.length - 1, a + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const hit = items[active];
      if (hit) go(hit.href);
      else if (query.trim().length >= 2) go(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  }

  let index = -1;
  const renderGroup = (label: string, list: SearchHit[]) =>
    list.length > 0 && (
      <div role="group" aria-label={label} className="py-1.5">
        <p className="px-3 pb-1 pt-1.5 text-xs font-medium text-fg-subtle">{label}</p>
        {list.map((hit) => {
          index++;
          const i = index;
          return (
            <button
              key={hit.href}
              id={`cmd-${i}`}
              role="option"
              aria-selected={i === active}
              onMouseMove={() => setActive(i)}
              onClick={() => go(hit.href)}
              className={`flex w-full items-center justify-between gap-3 rounded-md px-3 py-2.5 text-left text-sm ${
                i === active ? "bg-bg-muted text-fg" : "text-fg"
              }`}
            >
              <span className="truncate font-medium">{hit.label}</span>
              {hit.count >= 0 && <span className="num shrink-0 text-xs text-fg-subtle">{hit.count}</span>}
            </button>
          );
        })}
      </div>
    );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 items-center gap-2 whitespace-nowrap rounded-lg border border-border bg-bg-subtle px-2.5 text-sm text-fg-muted transition-colors hover:border-border-strong hover:text-fg sm:w-48 sm:pr-1.5"
        aria-label={hint}
      >
        <SearchIcon />
        <span className="hidden flex-1 truncate text-left sm:inline">{label}…</span>
        <span className="hidden gap-0.5 sm:flex" aria-hidden="true">
          <kbd className="kbd">{mac ? "⌘" : "Ctrl"}</kbd>
          <kbd className="kbd">K</kbd>
        </span>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[12vh]" role="presentation">
          <div className="absolute inset-0 bg-ink/40 backdrop-blur-[2px] animate-[enter_0.15s_ease-out]" onClick={close} />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={hint}
            className="relative w-full max-w-xl overflow-hidden rounded-xl border border-border bg-bg shadow-2xl animate-[enter_0.2s_ease-out]"
            onKeyDown={onKeyDown}
          >
            <div className="flex items-center gap-3 border-b border-border px-4">
              <SearchIcon />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t.placeholder}
                className="h-14 flex-1 bg-transparent text-base outline-none placeholder:text-fg-subtle"
                role="combobox"
                aria-expanded="true"
                aria-controls="cmd-list"
                aria-activedescendant={items.length ? `cmd-${active}` : undefined}
                autoComplete="off"
                spellCheck={false}
              />
              {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-border-strong border-t-accent" aria-hidden="true" />}
              <kbd className="kbd">Esc</kbd>
            </div>
            <div id="cmd-list" role="listbox" className="max-h-[50vh] overflow-y-auto p-1.5">
              {showQuick ? (
                renderGroup(t.goTo, items)
              ) : flat.length === 0 && !loading ? (
                <p className="px-3 py-8 text-center text-sm text-fg-muted">{t.empty}</p>
              ) : (
                <>
                  {renderGroup(t.companies, results.companies)}
                  {renderGroup(t.jobs, results.titles)}
                </>
              )}
            </div>
            <div className="hidden items-center gap-4 border-t border-border bg-bg-subtle px-4 py-2.5 text-xs text-fg-subtle sm:flex">
              <span className="flex items-center gap-1.5"><kbd className="kbd">↑</kbd><kbd className="kbd">↓</kbd> {t.navigate}</span>
              <span className="flex items-center gap-1.5"><kbd className="kbd">↵</kbd> {t.open}</span>
              <span className="flex items-center gap-1.5"><kbd className="kbd">Esc</kbd> {t.close}</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function SearchIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className={`${className} shrink-0 fill-none stroke-current stroke-[1.7]`}>
      <circle cx="9" cy="9" r="5.5" />
      <path d="m13.2 13.2 3.8 3.8" strokeLinecap="round" />
    </svg>
  );
}
