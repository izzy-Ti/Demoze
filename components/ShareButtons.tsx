"use client";

import { useState } from "react";

/** Telegram share (the main channel in Ethiopia) + copy link. */
export function ShareButtons({ path, text, labels }: { path: string; text: string; labels: { telegram: string; copy: string; copied: string } }) {
  const [copied, setCopied] = useState(false);
  const url = () => (typeof window === "undefined" ? path : window.location.origin + path);

  return (
    <div className="flex items-center gap-2">
      <a
        href={`https://t.me/share/url?url=${encodeURIComponent(path)}&text=${encodeURIComponent(text)}`}
        onClick={(e) => {
          e.currentTarget.href = `https://t.me/share/url?url=${encodeURIComponent(url())}&text=${encodeURIComponent(text)}`;
        }}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-secondary btn-sm"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-[#229ED9]">
          <path d="M21.9 4.3 18.7 19.4c-.2 1-.9 1.3-1.8.8l-4.9-3.6-2.4 2.3c-.3.3-.5.5-1 .5l.3-5 9.2-8.3c.4-.4-.1-.6-.6-.2L6.2 13 1.3 11.5c-1-.3-1.1-1 .2-1.5L20.6 2.7c.9-.3 1.6.2 1.3 1.6z" />
        </svg>
        {labels.telegram}
      </a>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url());
            setCopied(true);
            setTimeout(() => setCopied(false), 1800);
          } catch {
            /* clipboard blocked */
          }
        }}
        className="btn-secondary btn-sm"
        aria-live="polite"
      >
        <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4 fill-none stroke-current stroke-[1.6]">
          {copied ? <path d="m4.5 10.5 3.5 3.5 7.5-8" strokeLinecap="round" strokeLinejoin="round" /> : <path d="M8 12a3 3 0 0 0 4.2 0l3-3a3 3 0 0 0-4.2-4.2l-.8.8M12 8a3 3 0 0 0-4.2 0l-3 3A3 3 0 0 0 9 15.2l.8-.8" strokeLinecap="round" />}
        </svg>
        {copied ? labels.copied : labels.copy}
      </button>
    </div>
  );
}
