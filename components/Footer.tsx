import Link from "next/link";
import { LOCALES, LOCALE_NAMES, type Dictionary, type Locale } from "@/lib/i18n";
import { setLanguage } from "@/app/actions";
import { Logo } from "./Logo";

export function Footer({ t, locale }: { t: Dictionary; locale: Locale }) {
  const product = [
    { href: "/companies", label: t.nav.companies },
    { href: "/jobs", label: t.nav.jobs },
    { href: "/compare", label: t.nav.compare },
    { href: "/calculator", label: t.nav.calculator },
    { href: "/submit", label: t.nav.share },
  ];
  const trust = [
    { href: "/about", label: t.footer.about },
    { href: "/about#verification", label: t.footer.verification },
    { href: "/about#removal", label: t.footer.removal },
  ];
  return (
    <footer className="border-t border-border bg-bg-subtle">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.6fr_1fr_1fr]">
        <div className="max-w-sm">
          <Logo />
          <p className="mt-4 text-sm leading-relaxed text-fg-muted">{t.footer.promise}</p>
          <form action={setLanguage} className="mt-6 inline-flex rounded-lg border border-border bg-bg p-0.5" aria-label={t.footer.language}>
            {LOCALES.map((l) => (
              <button
                key={l}
                name="locale"
                value={l}
                aria-pressed={l === locale}
                className={`rounded-md px-3 py-1 text-sm transition-colors ${l === locale ? "bg-bg-muted font-medium text-fg" : "text-fg-muted hover:text-fg"}`}
              >
                {LOCALE_NAMES[l]}
              </button>
            ))}
          </form>
        </div>
        <FooterCol title={t.footer.product} links={product} />
        <FooterCol title={t.footer.trust} links={trust} />
      </div>
      <div className="border-t border-border">
        <p className="mx-auto max-w-6xl px-4 py-5 text-xs text-fg-subtle sm:px-6">
          © {new Date().getFullYear()} Demoze · {t.footer.made}
        </p>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <div>
      <p className="text-sm font-medium">{title}</p>
      <ul className="mt-3 space-y-2.5">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="text-sm text-fg-muted transition-colors hover:text-fg">{l.label}</Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
