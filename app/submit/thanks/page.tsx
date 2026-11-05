import Link from "next/link";
import type { Metadata } from "next";
import { getT } from "@/lib/locale";
import { fmt } from "@/lib/i18n";
import { displayTitle, slugToTitle } from "@/lib/normalize";
import { getCompanyBySlug, getCompanyStats, getCompanyTitleStats, getTitleStats } from "@/lib/stats";
import { SalaryRange } from "@/components/SalaryRange";
import { Steps } from "@/components/Steps";
import { ShareButtons } from "@/components/ShareButtons";

export const metadata: Metadata = { title: "Thank you", robots: { index: false } };
export const dynamic = "force-dynamic";

/** Step 3: the reward for sharing is seeing what the group earns (privacy gate still applies). */
export default async function ThanksPage({ searchParams }: { searchParams: Promise<{ c?: string; t?: string; f?: string }> }) {
  const t = await getT();
  const sp = await searchParams;
  const company = sp.c ? await getCompanyBySlug(sp.c.toString().slice(0, 100)) : null;
  const title = sp.t ? slugToTitle(sp.t.toString().slice(0, 100)) : "";

  const [groupStats, titleStats, companyStats] = await Promise.all([
    company && title ? getCompanyTitleStats(company.id, title) : null,
    title ? getTitleStats(title) : null,
    company ? getCompanyStats(company.id) : null,
  ]);
  const nice = displayTitle(title);
  const panels = [
    company && groupStats ? { key: "g", heading: fmt(t.thanks.groupStats, { title: nice, company: company.name }), stats: groupStats } : null,
    titleStats ? { key: "t", heading: fmt(t.thanks.titleStats, { title: nice }), stats: titleStats } : null,
    company && companyStats ? { key: "c", heading: fmt(t.thanks.companyStats, { company: company.name }), stats: companyStats } : null,
  ].filter((p): p is NonNullable<typeof p> => p !== null);

  return (
    <div className="mx-auto max-w-3xl">
      <Steps current={3} labels={t.submit.stepLabels} />
      <div className="mt-8 flex items-start gap-4">
        <span className="enter grid h-11 w-11 shrink-0 place-items-center rounded-full bg-accent text-white" aria-hidden="true">
          <svg viewBox="0 0 20 20" className="h-6 w-6 fill-none stroke-current stroke-2" strokeLinecap="round" strokeLinejoin="round"><path d="m5 10.5 3.5 3.5L15 7" /></svg>
        </span>
        <div>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{t.thanks.title}</h1>
          <p className="mt-2 text-fg-muted">{t.thanks.subtitle}</p>
        </div>
      </div>

      {sp.f === "1" && <p className="notice mt-8">{t.thanks.pending}</p>}

      <div className="mt-10 grid gap-6 md:grid-cols-2">
        {panels.map((p, i) => (
          <section key={p.key} className={`card card-pad enter ${i === 0 ? "md:col-span-2" : ""}`} style={{ "--d": i + 1 } as React.CSSProperties}>
            <h2 className="mb-5 font-medium">{p.heading}</h2>
            <SalaryRange stats={p.stats} t={t} size={i === 0 ? "lg" : "md"} />
          </section>
        ))}
      </div>

      <div className="mt-10 flex flex-col gap-6 border-t border-border pt-8 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {company && <Link href={`/company/${company.slug}`} className="btn-primary">{t.thanks.seeCompany}</Link>}
          {title && titleStats && titleStats.count > 0 && (
            <Link href={`/jobs/${encodeURIComponent(sp.t ?? "")}`} className="btn-secondary">{fmt(t.thanks.seeTitle, { title: nice })}</Link>
          )}
          <Link href="/submit" className="btn-ghost">{t.thanks.shareAnother}</Link>
        </div>
      </div>
      <div className="card card-pad mt-8 flex flex-col gap-4 bg-bg-subtle sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-fg-muted">{t.thanks.shareFriends}</p>
        <ShareButtons path="/submit" text="Share your salary anonymously on Demoze" labels={{ telegram: t.common.shareTelegram, copy: t.common.copyLink, copied: t.common.copied }} />
      </div>
    </div>
  );
}
