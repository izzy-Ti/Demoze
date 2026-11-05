import Link from "next/link";
import type { Metadata } from "next";
import { SearchBar } from "@/components/SearchBar";
import { CompanyMark } from "@/components/CompanyMark";
import { getT } from "@/lib/locale";
import { fmt } from "@/lib/i18n";
import { formatNumber } from "@/lib/format";
import { displayTitle, normalizeTitle, titleToSlug } from "@/lib/normalize";
import { searchCompanies, searchTitles } from "@/lib/stats";

export const metadata: Metadata = { title: "Search", robots: { index: false } };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const t = await getT();
  const q = ((await searchParams).q ?? "").toString().trim().slice(0, 100);
  const [companies, titles] =
    q.length >= 2 ? await Promise.all([searchCompanies(q, 20), searchTitles(normalizeTitle(q), 20)]) : [[], []];
  const visible = companies.filter((c) => c.n > 0);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-semibold tracking-tight">{q ? fmt(t.search.resultsFor, { q }) : t.search.title}</h1>
      <div className="mt-6">
        <SearchBar
          placeholder={t.home.searchPlaceholder}
          button={t.home.searchButton}
          groups={{ companies: t.palette.companies, jobs: t.palette.jobs }}
          defaultValue={q}
          size="md"
          autoFocus={!q}
        />
      </div>

      {q.length < 2 ? (
        <p className="mt-8 text-fg-muted">{t.search.enterQuery}</p>
      ) : visible.length === 0 && titles.length === 0 ? (
        <div className="card card-pad mt-8">
          <p className="text-fg-muted">{t.search.noResults}</p>
          <Link href="/submit" className="btn-primary btn-sm mt-4">{t.nav.share}</Link>
        </div>
      ) : (
        <div className="mt-10 space-y-10">
          {visible.length > 0 && (
            <section aria-labelledby="r-co">
              <h2 id="r-co" className="kicker mb-3">{t.search.companies} · {visible.length}</h2>
              <ul className="card divide-y divide-border overflow-hidden">
                {visible.map((c) => (
                  <li key={c.slug}>
                    <Link href={`/company/${c.slug}`} className="flex items-center gap-3 px-4 py-3 hover:bg-bg-subtle">
                      <CompanyMark name={c.name} />
                      <span className="flex-1 truncate font-medium">{c.name}</span>
                      <span className="num text-sm text-fg-muted">{fmt(t.search.salaries, { n: formatNumber(c.n) })}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
          {titles.length > 0 && (
            <section aria-labelledby="r-ti">
              <h2 id="r-ti" className="kicker mb-3">{t.search.titles} · {titles.length}</h2>
              <ul className="card divide-y divide-border overflow-hidden">
                {titles.map((r) => (
                  <li key={r.title}>
                    <Link href={`/jobs/${titleToSlug(r.title)}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-bg-subtle">
                      <span className="truncate font-medium">{displayTitle(r.title)}</span>
                      <span className="num text-sm text-fg-muted">{fmt(t.search.salaries, { n: formatNumber(r.n) })}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
