import Link from "next/link";
import type { Metadata } from "next";
import { getT } from "@/lib/locale";
import type { Dictionary } from "@/lib/i18n";
import { INDUSTRIES } from "@/lib/constants";
import { formatNumber } from "@/lib/format";
import { getIndustryCounts, listCompanies, type CompanySort } from "@/lib/stats";
import { PageHeader, Pagination } from "@/components/PageHeader";
import { CompanyMark } from "@/components/CompanyMark";
import { Stars } from "@/components/Stars";

export const metadata: Metadata = {
  title: "Companies",
  description: "Salaries and reviews for companies in Ethiopia, shared anonymously by employees.",
};

type SP = { q?: string; industry?: string; sort?: string; page?: string };

export default async function CompaniesPage({ searchParams }: { searchParams: Promise<SP> }) {
  const t = await getT();
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 80);
  const industry = (INDUSTRIES as readonly string[]).includes(sp.industry ?? "") ? sp.industry : undefined;
  const sort: CompanySort = sp.sort === "rating" || sp.sort === "name" ? sp.sort : "popular";
  const page = Math.max(1, Math.min(500, Number(sp.page) || 1));

  const [list, industries] = await Promise.all([listCompanies({ q, industry, sort, page }), getIndustryCounts()]);
  const label = (k: string) => t.industries[k as keyof Dictionary["industries"]] ?? k;
  const href = (over: Partial<SP>) => {
    const p = new URLSearchParams();
    const merged = { q, industry, sort: sort === "popular" ? undefined : sort, ...over };
    for (const [k, v] of Object.entries(merged)) if (v) p.set(k, String(v));
    const s = p.toString();
    return `/companies${s ? `?${s}` : ""}`;
  };

  return (
    <div>
      <PageHeader title={t.companies.title} subtitle={t.companies.subtitle} />

      <div className="grid gap-10 lg:grid-cols-[15rem_1fr]">
        <aside className="space-y-6">
          <form method="get" action="/companies" className="space-y-2">
            <label htmlFor="cq" className="label">{t.companies.filter}</label>
            <input id="cq" name="q" defaultValue={q} className="input" placeholder={t.companies.filterPlaceholder} />
            {industry && <input type="hidden" name="industry" value={industry} />}
            {sort !== "popular" && <input type="hidden" name="sort" value={sort} />}
          </form>
          <nav aria-label={t.companies.industry}>
            <p className="label">{t.companies.industry}</p>
            <ul className="space-y-0.5 text-sm">
              <li>
                <Link href={href({ industry: undefined, page: undefined })} className={`flex justify-between rounded-md px-2.5 py-1.5 ${!industry ? "bg-bg-muted font-medium" : "text-fg-muted hover:text-fg"}`}>
                  {t.companies.allIndustries}
                </Link>
              </li>
              {industries.map((i) => (
                <li key={i.industry}>
                  <Link
                    href={href({ industry: i.industry ?? undefined, page: undefined })}
                    aria-current={industry === i.industry ? "true" : undefined}
                    className={`flex justify-between rounded-md px-2.5 py-1.5 ${industry === i.industry ? "bg-bg-muted font-medium" : "text-fg-muted hover:text-fg"}`}
                  >
                    <span>{label(i.industry!)}</span>
                    <span className="num text-xs text-fg-subtle">{i.n}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-fg-muted">
              {industry ? label(industry) : t.companies.allIndustries}
              {q && <> · “{q}”</>}
            </p>
            <div className="flex rounded-lg border border-border p-0.5 text-sm" role="group" aria-label={t.companies.sort}>
              {(
                [
                  ["popular", t.companies.sortPopular],
                  ["rating", t.companies.sortRating],
                  ["name", t.companies.sortName],
                ] as const
              ).map(([key, text]) => (
                <Link
                  key={key}
                  href={href({ sort: key === "popular" ? undefined : key, page: undefined })}
                  aria-current={sort === key ? "true" : undefined}
                  className={`rounded-md px-3 py-1 ${sort === key ? "bg-bg-muted font-medium" : "text-fg-muted hover:text-fg"}`}
                >
                  {text}
                </Link>
              ))}
            </div>
          </div>

          {list.items.length === 0 ? (
            <p className="card card-pad text-sm text-fg-muted">{t.companies.empty}</p>
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {list.items.map((c, i) => (
                <li key={c.slug} className="enter" style={{ "--d": Math.min(i, 8) } as React.CSSProperties}>
                  <Link href={`/company/${c.slug}`} className="card flex h-full items-center gap-4 p-4 transition-colors hover:border-border-strong hover:bg-bg-subtle">
                    <CompanyMark name={c.name} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{c.name}</span>
                      <span className="mt-0.5 block truncate text-xs text-fg-muted">
                        {c.industry ? `${label(c.industry)} · ` : ""}
                        {formatNumber(c.count)} {t.common.salaries}
                      </span>
                    </span>
                    {c.rating != null && (
                      <span className="flex shrink-0 flex-col items-end gap-0.5">
                        <span className="num text-sm font-semibold">{c.rating.toFixed(1)}</span>
                        <Stars value={c.rating} label={t.common.rating} />
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Pagination page={list.page} hasMore={list.hasMore} makeHref={(p) => href({ page: p > 1 ? String(p) : undefined })} labels={{ next: t.common.next, previous: t.common.previous }} />
        </div>
      </div>
    </div>
  );
}
