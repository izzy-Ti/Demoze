"use client";

import { useEffect, useState } from "react";

export type SearchHit = { label: string; href: string; count: number; industry?: string | null };
export type SearchResults = { companies: SearchHit[]; titles: SearchHit[] };

const EMPTY: SearchResults = { companies: [], titles: [] };

/** Debounced instant search against /api/search. */
export function useSearch(query: string) {
  const [results, setResults] = useState<SearchResults>(EMPTY);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults(EMPTY);
      setLoading(false);
      return;
    }
    setLoading(true);
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal });
        if (res.ok) setResults((await res.json()) as SearchResults);
      } catch {
        /* aborted or offline */
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 180);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  return { results, loading, flat: [...results.companies, ...results.titles] };
}
