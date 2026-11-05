import type { Metadata } from "next";
import { getT } from "@/lib/locale";
import { listTitles } from "@/lib/stats";
import { displayTitle, titleToSlug, normalizeTitle } from "@/lib/normalize";
import { PageHeader, Pagination } from "@/components/PageHeader";
import { StatsTable } from "@/components/StatsTable";

export const metadata: Metadata = {
  title: "Job titles",
  description: "Median monthly salaries by job title in Ethiopia, from anonymous employee submissions.",
};

export default async function JobsIndexPage({ searchParams }: { searchParams: Promise<{ q?: string; page?: string }> }) {
  const t = await getT();
  const sp = await searchParams;
  const q = normalizeTitle((sp.q ?? "").slice(0, 80));
  const page = Math.max(1, Math.min(500, Number(sp.page) || 1));
  const list = await listTitles({ q: q || undefined, page });

  return (
    <div>
      <PageHeader title={t.jobsIndex.title} subtitle={t.jobsIndex.subtitle} />
      <form method="get" action="/jobs" className="mb-6 max-w-sm">
        <label htmlFor="jq" className="sr-only">{t.jobsIndex.filter}</label>
        <input id="jq" name="q" defaultValue={sp.q ?? ""} className="input" placeholder={t.jobsIndex.filter} />
      </form>
      {list.items.length === 0 ? (
        <p className="card card-pad text-sm text-fg-muted">{t.jobsIndex.empty}</p>
      ) : (
        <div className="card px-5 py-1">
          <StatsTable
            t={t}
            firstColumn={t.common.jobTitle}
            rows={list.items.map((r) => ({
              key: r.title,
              label: displayTitle(r.title),
              href: `/jobs/${titleToSlug(r.title)}`,
              sub: r.stats.enough ? undefined : `${r.count} ${t.common.salaries}`,
              stats: r.stats,
            }))}
          />
        </div>
      )}
      <Pagination
        page={list.page}
        hasMore={list.hasMore}
        makeHref={(p) => `/jobs?${new URLSearchParams({ ...(sp.q ? { q: sp.q } : {}), ...(p > 1 ? { page: String(p) } : {}) })}`}
        labels={{ next: t.common.next, previous: t.common.previous }}
      />
    </div>
  );
}
