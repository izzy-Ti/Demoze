import Link from "next/link";
import type { Dictionary } from "@/lib/i18n";
import { Logo } from "./Logo";
import { CommandPalette } from "./CommandPalette";
import { MobileMenu } from "./MobileMenu";
import { NavLink } from "./NavLink";

export function Header({ t }: { t: Dictionary }) {
  const links = [
    { href: "/companies", label: t.nav.companies },
    { href: "/jobs", label: t.nav.jobs },
    { href: "/compare", label: t.nav.compare },
    { href: "/calculator", label: t.nav.calculator },
  ];
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/85 backdrop-blur-lg supports-[backdrop-filter]:bg-bg/70">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4 sm:px-6">
        <Link href="/" aria-label={t.site.name} className="shrink-0 rounded-md">
          <Logo />
        </Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
          {links.map((l) => (
            <NavLink key={l.href} href={l.href}>{l.label}</NavLink>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <CommandPalette t={t.palette} hint={t.nav.searchHint} label={t.nav.search} quickLinks={[...links, { href: "/submit", label: t.nav.share }]} />
          <Link href="/submit" className="btn-primary btn-sm hidden sm:inline-flex">{t.nav.share}</Link>
          <MobileMenu label={t.nav.menu} links={[...links, { href: "/about", label: t.nav.about }]} cta={{ href: "/submit", label: t.nav.share }} />
        </div>
      </div>
    </header>
  );
}
