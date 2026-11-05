"use client";

import Link from "next/link";
import { useEffect } from "react";
import { getDictionary } from "@/lib/i18n";

/** Friendly error screen. Raw errors are never shown to users (only logged to the dev console). */
export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = getDictionary("en");
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") console.error(error);
  }, [error]);
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">{t.errors.generic}</h1>
      {error.digest && <p className="num mt-3 text-xs text-fg-subtle">ref {error.digest}</p>}
      <div className="mt-8 flex justify-center gap-2">
        <button onClick={reset} className="btn-primary">{t.errors.tryAgain}</button>
        <Link href="/" className="btn-secondary">{t.errors.goHome}</Link>
      </div>
    </div>
  );
}
