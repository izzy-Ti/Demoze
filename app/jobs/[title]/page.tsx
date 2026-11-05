import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getT } from "@/lib/locale";
import { fmt } from "@/lib/i18n";
import { getTitlePage } from "@/lib/stats";
import { displayTitle, slugToTitle, titleToSlug } from "@/lib/normalize";
import { formatNumber } from "@/lib/format";
import { SalaryRange } from "@/components/SalaryRange";
import { Histogram } from "@/components/Histogram";
import { StatsTable } from "@/components/StatsTable";
import { ShareButtons } from "@/components/ShareButtons";
import { PageHeader, SectionTitle } from "@/components/PageHeader";

export async function generateMetadata({ params }: { params: Promise<{ title: string }> }): Promise<Metadata> {
  const title = displayTitle(slugToTitle((await params).title));
  const pageTitle = `${title} salary in Ethiopia`;
  const description = `How much does a ${title} earn in Ethiopia? Anonymous monthly salary ranges in ETB by experience and company.`;
  return { title: pageTitle, description, openGraph: { title: pageTitle, description } };
}

export default async function JobPage({ params }: { params: Promise<{ title: string }> }) {
  const normalized = slugToTitle((await params).title);
  if (!normalized) notFound();
  const t = await getT();
  const data = await getTitlePage(normalized);
  if (data.total === 0) notFound();
  const title = displayTitle(normalized);
  const path = `/jobs/${titleToSlug(normalized)}`;

  return (
    <div>
      <PageHeader
        crumbs={[{ href: "/jobs", label: t.nav.jobs }, { label: title }]}
        title={`${title}`}
        meta={
          <>
            <span><span className="num font-medium text-fg">{formatNumber(data.total)}</span> {t.common.salaries}</span>
            <span>{fmt(t.jobs.acrossCompanies, { n: data.companyCount })}</span>
          </>
        }
        actions={
          <>
            <ShareButtons path={path} text={`${title} salaries in Ethiopia on Demoze`} labels={{ telegram: t.common.shareTelegram, copy: t.common.copyLink, copied: t.common.copied }} />
            <Link href="/submit" className="btn-primary btn-sm">{t.common.addYours}</Link>
          </>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <section className="card card-pad enter" style={{ "--d": 1 } as React.CSSProperties}>
          <SalaryRange stats={data.overall} t={t} />
          {data.overall.enough && (
            <Link href={`/compare?title=${encodeURIComponent(normalized)}`} className="btn-secondary mt-6 w-full">
              {t.jobs.compareCta} →
            </Link>
          )}
        </section>
        <section className="card card-pad enter" aria-labelledby="dist" style={{ "--d": 2 } as React.CSSProperties}>
          <h2 id="dist" className="section-title mb-8">{t.common.distribution}</h2>
          <Histogram data={data.histogram} t={t} height={190} />
        </section>
      </div>

      <div className="mt-14 grid gap-12 lg:grid-cols-2">
        <section aria-labelledby="by-exp">
          <SectionTitle id="by-exp" title={t.jobs.byExperience} />
          <div className="card px-5 py-1">
            <StatsTable
              t={t}
              firstColumn={t.common.experience}
              rows={data.byExperience.map((b) => ({ key: b.bucket, label: fmt(t.jobs.bucket, { k: b.bucket }), stats: b.stats }))}
            />
          </div>
        </section>
        <section aria-labelledby="top-co">
          <SectionTitle id="top-co" title={t.jobs.topCompanies} />
          <div className="card px-5 py-1">
            {data.topCompanies.length === 0 ? (
              <p className="py-4 text-sm text-fg-muted">{t.jobs.noCompanies}</p>
            ) : (
              <StatsTable
                t={t}
                firstColumn={t.common.company}
                rows={data.topCompanies.map((c) => ({ key: c.slug, label: c.name, href: `/company/${c.slug}`, stats: c.stats }))}
              />
            )}
          </div>
        </section>
      </div>

      {data.cities.length > 1 && (
        <section className="mt-12" aria-labelledby="by-city">
          <SectionTitle id="by-city" title={t.jobs.byCity} />
          <div className="card px-5 py-1">
            <StatsTable t={t} firstColumn={t.common.city} rows={data.cities.map((c) => ({ key: c.city, label: c.city, stats: c.stats }))} />
          </div>
        </section>
      )}
    </div>
  );
}
