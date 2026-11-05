"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const path = usePathname();
  const active = path === href || path.startsWith(href + "/");
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
        active ? "bg-bg-muted text-fg" : "text-fg-muted hover:text-fg"
      }`}
    >
      {children}
    </Link>
  );
}
