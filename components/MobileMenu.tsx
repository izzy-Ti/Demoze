"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

type L = { href: string; label: string };

export function MobileMenu({ label, links, cta }: { label: string; links: L[]; cta: L }) {
  const [open, setOpen] = useState(false);
  const path = usePathname();
  useEffect(() => setOpen(false), [path]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="mobile-menu"
        className="btn-ghost h-9 w-9 !px-0"
      >
        <span className="sr-only">{label}</span>
        <svg viewBox="0 0 20 20" aria-hidden="true" className="h-5 w-5 fill-none stroke-current stroke-[1.6]">
          {open ? <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" /> : <path d="M3 6h14M3 10h14M3 14h14" strokeLinecap="round" />}
        </svg>
      </button>
      {open && (
        <div id="mobile-menu" className="absolute inset-x-0 top-16 border-b border-border bg-bg px-4 pb-5 pt-2 shadow-lg">
          <nav className="flex flex-col">
            {links.map((l) => (
              <Link key={l.href} href={l.href} className="border-b border-border py-3 text-base font-medium last:border-0">
                {l.label}
              </Link>
            ))}
          </nav>
          <Link href={cta.href} className="btn-primary btn-lg mt-4 w-full">{cta.label}</Link>
        </div>
      )}
    </div>
  );
}
