import Link from "next/link";
import { SearchBar } from "@/components/SearchBar";
import { Histogram } from "@/components/Histogram";
import { RangeTrack } from "@/components/SalaryRange";
import { Stars } from "@/components/Stars";
import { CompanyMark } from "@/components/CompanyMark";
import { SectionTitle } from "@/components/PageHeader";
import { getT } from "@/lib/locale";
import { formatNumber } from "@/lib/format";
import { displayTitle, titleToSlug } from "@/lib/normalize";
import { getMarketSnapshot, getRecentCompanies, getSiteCounts, getTopPayingTitles } from "@/lib/stats";
import type { Dictionary } from "@/lib/i18n";

type D = React.CSSProperties & { "--d"?: number };

export default async function HomePage() {
  const t = await getT();
  const [counts, market, topTitles, recent] = await Promise.all([
    getSiteCounts(),
    getMarketSnapshot(),
    getTopPayingTitles(6),
    getRecentCompanies(6),
  ]);
  const shown = topTitles.flatMap((x) => (x.stats.enough ? [{ title: x.title, s: x.stats }] : []));
  const min = Math.min(...shown.map((x) => x.s.low));
  const max = Math.max(...shown.map((x) => x.s.high));
  const popular = [
    ...shown.slice(0, 3).map((x) => ({ href: `/jobs/${titleToSlug(x.title)}`, label: displayTitle(x.title) })),
    ...recent.slice(0, 2).map((c) => ({ href: `/company/${c.slug}`, label: c.name.replace(/\s*\(Demo data\)$/, "") })),
  ];

  return (
    <div className="space-y-24">
      {/* Hero */}
      <section className="grid items-center gap-12 pt-4 lg:grid-cols-[1.1fr_1fr] lg:gap-16">
        <div>
          <h1 className="enter text-[2.75rem] font-semibold leading-[1.02] tracking-[-0.04em] sm:text-6xl lg:text-[4.25rem]">
            {t.home.title}
          </h1>
          <p className="enter mt-5 max-w-lg text-lg leading-relaxed text-fg-muted" style={{ "--d": 1 } as D}>
            {t.home.subtitle}
          </p>
          <div className="enter mt-8 max-w-xl" style={{ "--d": 2 } as D}>
            <SearchBar
              placeholder={t.home.searchPlaceholder}
              button={t.home.searchButton}
              groups={{ companies: t.palette.companies, jobs: t.palette.jobs }}
            />
          </div>
          {popular.length > 0 && (
            <p className="enter mt-4 flex flex-wrap items-center gap-x-1.5 gap-y-2 text-sm" style={{ "--d": 3 } as D}>
              <span className="mr-1 text-fg-subtle">{t.home.popular}:</span>
              {popular.map((p) => (
                <Link key={p.href} href={p.href} className="rounded-full border border-border px-2.5 py-1 text-fg-muted transition-colors hover:border-border-strong hover:text-fg">
                  {p.label}
                </Link>
              ))}
            </p>
          )}
        </div>

        <div className="enter card card-pad shadow-[0_1px_2px_rgb(11_11_18/0.04),0_16px_40px_-16px_rgb(11_11_18/0.14)]" style={{ "--d": 2 } as D}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="kicker">{t.home.marketTitle}</p>
              {market.stats.enough ? (
                <p className="mt-1 flex items-baseline gap-2">
                  <span className="num text-4xl font-semibold">{formatNumber(market.stats.median)}</span>
                  <span className="text-sm text-fg-muted">{t.common.etb}</span>
                </p>
              ) : (
                <p className="mt-1 text-lg font-medium">{t.common.notEnoughData}</p>
              )}
              <p className="text-sm text-fg-muted">{t.home.marketMedian}</p>
            </div>
            <span className="badge">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-good" aria-hidden="true" /> {t.home.live}
            </span>
          </div>
          <div className="mt-8">
            <Histogram data={market.histogram} t={t} height={150} />
          </div>
          <dl className="mt-6 grid grid-cols-4 divide-x divide-border border-t border-border pt-5 text-center">
            <Stat label={t.home.statSalaries} value={counts.salaries} />
            <Stat label={t.home.statCompanies} value={counts.companies} />
            <Stat label={t.home.statTitles} value={counts.titles} />
            <Stat label={t.home.statVerified} value={counts.verified} accent />
          </dl>
        </div>
      </section>

      {/* Roles + companies */}
      <section className="grid gap-12 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <SectionTitle id="top" title={t.home.topPaying} aside={<Link href="/jobs" className="link text-sm">{t.common.viewAll} →</Link>} />
          {shown.length === 0 ? (
            <Empty>{t.home.topEmpty}</Empty>
          ) : (
            <ol className="card divide-y divide-border overflow-hidden" aria-labelledby="top">
              {shown.map(({ title, s }, i) => (
                <li key={title}>
                  <Link href={`/jobs/${titleToSlug(title)}`} className="grid grid-cols-[1.25rem_1fr_auto] items-center gap-4 px-5 py-4 transition-colors hover:bg-bg-subtle">
                    <span className="num text-sm text-fg-subtle">{i + 1}</span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{displayTitle(title)}</span>
                      <span className="mt-2.5 block max-w-xs"><RangeTrack low={s.low} median={s.median} high={s.high} min={min} max={max} d={i} /></span>
                    </span>
                    <span className="text-right">
                      <span className="num block text-lg font-semibold">{formatNumber(s.median)}</span>
                      <span className="block text-xs text-fg-subtle">{t.common.etb} {t.common.perMonth}</span>
                    </span>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </div>

        <div>
          <SectionTitle id="recent" title={t.home.recentCompanies} aside={<Link href="/companies" className="link text-sm">{t.common.viewAll} →</Link>} />
          {recent.length === 0 ? (
            <Empty>{t.home.companiesEmpty}</Empty>
          ) : (
            <ul className="card divide-y divide-border overflow-hidden" aria-labelledby="recent">
              {recent.map((c) => (
                <li key={c.slug}>
                  <Link href={`/company/${c.slug}`} className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-bg-subtle">
                    <CompanyMark name={c.name} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{c.name}</span>
                      <span className="block text-xs text-fg-muted">
                        {c.industry ? `${t.industries[c.industry as keyof Dictionary["industries"]] ?? c.industry} · ` : ""}
                        {formatNumber(c.count)} {t.common.salaries}
                      </span>
                    </span>
                    {c.rating != null && <Stars value={c.rating} label={t.common.rating} />}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Tools */}
      <section>
        <SectionTitle id="tools" title={t.home.toolsTitle} />
        <div className="grid gap-4 md:grid-cols-2">
          <ToolCard href="/compare" title={t.home.toolCompareTitle} body={t.home.toolCompareBody} visual={<CompareVisual />} />
          <ToolCard href="/calculator" title={t.home.toolNetTitle} body={t.home.toolNetBody} visual={<NetVisual t={t} />} />
        </div>
      </section>

      {/* Trust */}
      <section className="grid gap-10 border-y border-border py-12 md:grid-cols-3">
        <Trust icon="lock" title={t.home.trust1Title} body={t.home.trust1Body} />
        <Trust icon="check" title={t.home.trust2Title} body={t.home.trust2Body} />
        <Trust icon="shield" title={t.home.trust3Title} body={t.home.trust3Body} />
      </section>

      {/* CTA */}
      <section className="flex flex-col items-start justify-between gap-6 rounded-2xl bg-ink px-6 py-10 text-mist sm:flex-row sm:items-center sm:px-10">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">{t.home.ctaTitle}</h2>
          <p className="mt-2 text-[#a5a2b8]">{t.home.ctaBody}</p>
        </div>
        <Link href="/submit" className="btn-primary btn-lg shrink-0">{t.nav.share} →</Link>
      </section>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="flex flex-col-reverse px-1">
      <dt className="mt-0.5 text-xs text-fg-muted">{label}</dt>
      <dd className={`num text-xl font-semibold ${accent ? "text-accent-fg" : ""}`}>{formatNumber(value)}</dd>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="card card-pad text-sm text-fg-muted">{children}</p>;
}

function ToolCard({ href, title, body, visual }: { href: string; title: string; body: string; visual: React.ReactNode }) {
  return (
    <Link href={href} className="card group flex items-center justify-between gap-6 overflow-hidden p-6 transition-colors hover:border-border-strong hover:bg-bg-subtle">
      <div>
        <h3 className="text-lg font-semibold tracking-tight">{title}</h3>
        <p className="mt-1.5 max-w-xs text-sm text-fg-muted">{body}</p>
        <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-accent-fg">
          {title}
          <span aria-hidden="true" className="transition-transform group-hover:translate-x-0.5">→</span>
        </span>
      </div>
      <div aria-hidden="true" className="hidden shrink-0 sm:block">{visual}</div>
    </Link>
  );
}

function CompareVisual() {
  const bars = [18, 30, 46, 64, 82, 70, 52, 36, 22, 12];
  return (
    <div className="relative flex h-24 w-40 items-end gap-1">
      {bars.map((h, i) => (
        <span key={i} className={`flex-1 rounded-t-sm ${i === 6 ? "bg-accent" : "bg-accent-line"}`} style={{ height: `${h}%` }} />
      ))}
      <span className="absolute -top-2 right-[30%] h-[calc(100%+0.5rem)] w-px bg-fg" />
    </div>
  );
}

function NetVisual({ t }: { t: Dictionary }) {
  return (
    <div className="w-40 space-y-2.5 text-xs">
      {[
        [t.calculator.gross, "30,000", "w-full bg-border-strong"],
        [t.calculator.tax, "8,450", "w-[28%] bg-bad/70"],
        [t.calculator.pension, "2,100", "w-[7%] bg-fg-subtle"],
        [t.calculator.net, "19,450", "w-[65%] bg-accent"],
      ].map(([k, v, bar]) => (
        <div key={k}>
          <div className="flex justify-between text-fg-muted"><span>{k}</span><span className="num">{v}</span></div>
          <div className={`mt-1 h-1.5 rounded-full ${bar}`} />
        </div>
      ))}
    </div>
  );
}

function Trust({ icon, title, body }: { icon: "lock" | "check" | "shield"; title: string; body: string }) {
  const paths = {
    lock: <><rect x="4" y="9" width="12" height="8" rx="2" /><path d="M7 9V6.5a3 3 0 0 1 6 0V9" /></>,
    check: <><circle cx="10" cy="10" r="7" /><path d="m7 10 2 2 4-4" /></>,
    shield: <path d="M10 2.5 16 5v4.5c0 4-2.7 6.7-6 8-3.3-1.3-6-4-6-8V5z" />,
  };
  return (
    <div>
      <span className="grid h-9 w-9 place-items-center rounded-lg border border-border text-accent-fg">
        <svg viewBox="0 0 20 20" aria-hidden="true" className="h-5 w-5 fill-none stroke-current stroke-[1.6]" strokeLinecap="round" strokeLinejoin="round">{paths[icon]}</svg>
      </span>
      <h3 className="mt-4 font-semibold">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">{body}</p>
    </div>
  );
}
