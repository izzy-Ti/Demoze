import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { cache } from "react";
import { getT } from "@/lib/locale";
import { fmt, type Dictionary } from "@/lib/i18n";
import { getCompanyBySlug, getCompanyPage, type ReviewSort } from "@/lib/stats";
import { displayTitle, titleToSlug } from "@/lib/normalize";
import { formatNumber } from "@/lib/format";
import { SalaryRange } from "@/components/SalaryRange";
import { Histogram } from "@/components/Histogram";
import { StatsTable } from "@/components/StatsTable";
import { ReviewCard } from "@/components/ReviewCard";
import { Stars } from "@/components/Stars";
import { ShareButtons } from "@/components/ShareButtons";
import { PageHeader, SectionTitle } from "@/components/PageHeader";

const loadCompany = cache(async (slug: string) => getCompanyBySlug(decodeURIComponent(slug).toLowerCase()));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const company = await loadCompany((await params).slug);
  if (!company) return { title: "Company not found" };
  const title = `${company.name} salaries & reviews`;
  const description = `Anonymous salaries and reviews from people working at ${company.name} in Ethiopia. Salary ranges by job title in ETB.`;
  return { title, description, alternates: { canonical: `/company/${company.slug}` }, openGraph: { title, description } };
}

export default async function CompanyPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ sort?: string }>;
}) {
  const company = await loadCompany((await params).slug);
  if (!company) notFound();
  const sort: ReviewSort = (await searchParams).sort === "recent" ? "recent" : "helpful";
  const t = await getT();
  const data = await getCompanyPage(company.id, sort);
  const industry = company.industry ? t.industries[company.industry as keyof Dictionary["industries"]] ?? company.industry : null;
  const written = data.reviews.filter((r) => r.pros || r.cons);
  const path = `/company/${company.slug}`;

  return (
    <div>
      <PageHeader
        crumbs={[{ href: "/companies", label: t.nav.companies }, { label: company.name }]}
        title={company.name}
        meta={
          <>
            {industry && <span>{industry}</span>}
            {company.city && <span>{company.city}</span>}
            <span><span className="num font-medium text-fg">{formatNumber(data.overall.count)}</span> {t.common.salaries}</span>
            {data.avgRating != null && (
              <span className="flex items-center gap-2">
                <Stars value={data.avgRating} label={t.company.overallRating} />
                <span className="num font-medium text-fg">{data.avgRating.toFixed(1)}</span>
              </span>
            )}
            {data.isDemo && <span className="badge border-[var(--warn-border)] bg-[var(--warn-bg)] text-[var(--warn-fg)]">{t.common.demoNotice}</span>}
          </>
        }
        actions={
          <>
            <ShareButtons path={path} text={`${company.name} salaries on Demoze`} labels={{ telegram: t.common.shareTelegram, copy: t.common.copyLink, copied: t.common.copied }} />
            <Link href={`/submit?company=${encodeURIComponent(company.name)}`} className="btn-primary btn-sm">{t.common.addYours}</Link>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        <section className="card card-pad enter" aria-labelledby="overall" style={{ "--d": 1 } as React.CSSProperties}>
          <h2 id="overall" className="section-title mb-5">{t.company.allSalaries}</h2>
          <SalaryRange stats={data.overall} t={t} />
          {data.overall.enough && <p className="mt-4 text-xs text-fg-subtle">{t.common.rangeNote}</p>}
        </section>

        <div className="grid gap-6">
          <section className="card card-pad enter" aria-labelledby="dist" style={{ "--d": 2 } as React.CSSProperties}>
            <h2 id="dist" className="section-title mb-6">{t.common.distribution}</h2>
            <Histogram data={data.histogram} t={t} height={120} />
          </section>
          {data.avgRating != null && (
            <section className="card card-pad enter" aria-labelledby="rating" style={{ "--d": 3 } as React.CSSProperties}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 id="rating" className="kicker">{t.company.overallRating}</h2>
                  <p className="num mt-1 text-4xl font-semibold">{data.avgRating.toFixed(1)}</p>
                  <p className="text-sm text-fg-muted">{fmt(t.company.ratingBased, { n: data.ratingCount })}</p>
                </div>
                <ul className="w-44 space-y-1.5" aria-hidden="true">
                  {data.ratingDist.map((r) => (
                    <li key={r.star} className="flex items-center gap-2 text-xs text-fg-muted">
                      <span className="num w-2">{r.star}</span>
                      <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-bg-muted">
                        <span className="grow-in block h-full rounded-full bg-accent" style={{ width: `${r.share * 100}%` }} />
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          )}
        </div>
      </div>

      {data.overall.enough && data.titles.length > 0 && (
        <section className="mt-14" aria-labelledby="by-title">
          <SectionTitle id="by-title" title={t.company.salariesByTitle} />
          <div className="card px-5 py-1">
            {data.titles.length > 0 ? (
              <StatsTable
                t={t}
                firstColumn={t.common.jobTitle}
                rows={data.titles.map((r) => ({ key: r.title, label: displayTitle(r.title), href: `/jobs/${titleToSlug(r.title)}`, stats: r.stats }))}
              />
            ) : (
              <p className="py-4 text-sm text-fg-muted">{t.common.notEnoughData}</p>
            )}
          </div>
          {data.hiddenTitleCount > 0 && (
            <p className="mt-3 text-sm text-fg-muted">{fmt(t.company.hiddenTitles, { n: data.hiddenTitleCount })}</p>
          )}
        </section>
      )}

      {data.overall.enough && data.titles.length === 0 && data.hiddenTitleCount > 0 && (
        <p className="mt-8 text-sm text-fg-muted">{fmt(t.company.hiddenTitles, { n: data.hiddenTitleCount })}</p>
      )}

      <section className="mt-14" aria-labelledby="reviews">
        <SectionTitle
          id="reviews"
          title={`${t.company.reviews} · ${formatNumber(data.reviews.length)}`}
          aside={
            <div className="flex rounded-lg border border-border p-0.5 text-sm">
              {(["helpful", "recent"] as const).map((s) => (
                <Link
                  key={s}
                  href={`${path}?sort=${s}#reviews`}
                  scroll={false}
                  aria-current={sort === s ? "true" : undefined}
                  className={`rounded-md px-3 py-1 ${sort === s ? "bg-bg-muted font-medium text-fg" : "text-fg-muted hover:text-fg"}`}
                >
                  {s === "helpful" ? t.company.sortHelpful : t.company.sortRecent}
                </Link>
              ))}
            </div>
          }
        />
        {data.reviews.length === 0 ? (
          <p className="card card-pad text-sm text-fg-muted">{t.company.noReviews}</p>
        ) : (
          <div className="divide-y divide-border border-y border-border">
            {[...written, ...data.reviews.filter((r) => !r.pros && !r.cons)].map((r) => (
              <ReviewCard key={r.id} review={r} t={t} showBand={data.overall.enough} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

