import Link from "next/link";
import type { Metadata } from "next";
import { getT } from "@/lib/locale";
import { fmt } from "@/lib/i18n";
import { compareSalary, listTitles } from "@/lib/stats";
import { displayTitle, normalizeTitle, titleToSlug } from "@/lib/normalize";
import { formatNumber } from "@/lib/format";
import { netPay } from "@/lib/tax";
import { PageHeader } from "@/components/PageHeader";
import { Histogram } from "@/components/Histogram";

export const metadata: Metadata = {
  title: "Compare your salary",
  description: "See how your salary compares with people in the same role in Ethiopia. Nothing you enter is saved.",
};

type SP = { title?: string; salary?: string; years?: string };

/** Nothing typed here is stored: the comparison is computed per request from published aggregates. */
export default async function ComparePage({ searchParams }: { searchParams: Promise<SP> }) {
  const t = await getT();
  const sp = await searchParams;
  const title = normalizeTitle((sp.title ?? "").slice(0, 100));
  const salary = Math.round(Number(String(sp.salary ?? "").replace(/[,\s]/g, "")));
  const yearsRaw = sp.years === undefined || sp.years === "" ? undefined : Number(sp.years);
  const years = yearsRaw != null && Number.isFinite(yearsRaw) && yearsRaw >= 0 && yearsRaw <= 50 ? Math.floor(yearsRaw) : undefined;
  const valid = title.length >= 2 && Number.isFinite(salary) && salary >= 500 && salary <= 2_000_000;

  const [suggestions, result] = await Promise.all([
    listTitles({ page: 1 }),
    valid ? compareSalary(title, salary, years) : null,
  ]);
  const nice = displayTitle(title);

  return (
    <div>
      <PageHeader title={t.compare.title} subtitle={t.compare.subtitle} />

      <div className="grid gap-10 lg:grid-cols-[22rem_1fr]">
        <form method="get" action="/compare" className="card card-pad h-fit space-y-5 lg:sticky lg:top-24">
          <div>
            <label htmlFor="c-title" className="label">{t.compare.titleLabel}</label>
            <input id="c-title" name="title" list="c-titles" required minLength={2} maxLength={100} defaultValue={sp.title ? nice : ""} className="input" placeholder={t.submit.titlePlaceholder} autoComplete="off" />
            <datalist id="c-titles">
              {suggestions.items.map((s) => <option key={s.title} value={displayTitle(s.title)} />)}
            </datalist>
          </div>
          <div>
            <label htmlFor="c-salary" className="label">{t.compare.salaryLabel}</label>
            <div className="relative">
              <input id="c-salary" name="salary" required inputMode="numeric" pattern="[0-9,]*" defaultValue={sp.salary ?? ""} className="input num pr-14 text-lg" placeholder="25,000" />
              <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-fg-subtle">ETB</span>
            </div>
          </div>
          <div>
            <label htmlFor="c-years" className="label">{t.compare.experienceLabel}</label>
            <input id="c-years" name="years" type="number" inputMode="numeric" min={0} max={50} defaultValue={sp.years ?? ""} className="input num" />
          </div>
          <button className="btn-primary w-full">{t.compare.submit}</button>
        </form>

        <div aria-live="polite">
          {!result ? (
            <EmptyState />
          ) : !result.enough ? (
            <div className="card card-pad">
              <p className="font-medium">{result.overall.count === 0 ? fmt(t.compare.unknown, { title: nice }) : fmt(t.compare.notEnough, { title: nice })}</p>
              <p className="mt-2 text-sm text-fg-muted">{t.compare.shareNudge}</p>
              <div className="mt-5 flex gap-2">
                <Link href="/submit" className="btn-primary btn-sm">{t.nav.share}</Link>
                <Link href="/jobs" className="btn-secondary btn-sm">{t.nav.jobs}</Link>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <section className="card card-pad enter">
                <p className="kicker">{t.compare.youEarn}</p>
                <p className="mt-1 flex items-baseline gap-3">
                  <span className="num text-6xl font-semibold tracking-tight text-accent-fg sm:text-7xl">{result.percentile}%</span>
                </p>
                <p className="mt-1 text-fg-muted">{fmt(t.compare.ofPeople, { title: nice })}</p>
                <div className="mt-6 h-2.5 overflow-hidden rounded-full bg-bg-muted" aria-hidden="true">
                  <div className="grow-in h-full rounded-full bg-accent" style={{ width: `${result.percentile}%` }} />
                </div>
                <dl className="mt-6 grid gap-4 border-t border-border pt-5 sm:grid-cols-3">
                  <Fact label={t.compare.yourPay} value={`${formatNumber(salary)} ETB`} />
                  <Fact label={t.common.median} value={`${formatNumber(result.overall.median)} ETB`} />
                  <Fact
                    label={salary === result.overall.median ? t.compare.equal : salary > result.overall.median ? t.compare.above : t.compare.below}
                    value={`${salary >= result.overall.median ? "+" : "−"}${Math.abs(Math.round(((salary - result.overall.median) / result.overall.median) * 100))}%`}
                    tone={salary >= result.overall.median ? "good" : "bad"}
                  />
                </dl>
              </section>

              <section className="card card-pad enter" style={{ "--d": 1 } as React.CSSProperties}>
                <h2 className="section-title mb-8">{t.common.distribution}</h2>
                <Histogram data={result.histogram} t={t} you={salary} height={180} />
              </section>

              <div className="grid gap-4 sm:grid-cols-2">
                {result.bucket?.enough && result.bucketPercentile != null && (
                  <p className="card card-pad text-sm">{fmt(t.compare.withExperience, { k: result.bucketKey!, p: result.bucketPercentile })}</p>
                )}
                <p className="card card-pad text-sm">
                  {fmt(t.compare.netNudge, { net: formatNumber(Math.round(netPay(salary).net)) })}{" "}
                  <Link href={`/calculator?gross=${salary}`} className="link">{t.nav.calculator} →</Link>
                </p>
              </div>
              <p className="text-sm text-fg-muted">
                <Link href={`/jobs/${titleToSlug(title)}`} className="link">{fmt(t.thanks.seeTitle, { title: nice })} →</Link>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Fact({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  return (
    <div>
      <dt className="text-sm text-fg-muted">{label}</dt>
      <dd className={`num mt-0.5 text-xl font-semibold ${tone === "good" ? "text-good" : tone === "bad" ? "text-bad" : ""}`}>{value}</dd>
    </div>
  );
}

function EmptyState() {
  const bars = [10, 18, 30, 46, 62, 78, 66, 50, 36, 24, 14, 8];
  return (
    <div className="grid h-full min-h-72 place-items-center rounded-xl border border-dashed border-border-strong p-10" aria-hidden="true">
      <div className="flex h-32 w-64 items-end gap-1.5 opacity-60">
        {bars.map((h, i) => (
          <span key={i} className={`bar-in flex-1 rounded-t-sm ${i === 7 ? "bg-accent" : "bg-accent-line"}`} style={{ height: `${h}%`, "--d": i } as React.CSSProperties} />
        ))}
      </div>
    </div>
  );
}
