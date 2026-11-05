import type { Metadata } from "next";
import { and, count, desc, eq, ilike, inArray, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { companies, reports, submissions } from "@/lib/schema";
import { isAdmin } from "@/lib/admin-auth";
import { getT } from "@/lib/locale";
import { formatEtb, formatMonthYear, formatNumber } from "@/lib/format";
import { groupBy } from "@/lib/stats-core";
import { getAdminStats } from "@/lib/stats";
import type { Dictionary } from "@/lib/i18n";
import { LoginForm } from "./LoginForm";
import { PageHeader, SectionTitle } from "@/components/PageHeader";
import { approveSubmission, logout, moveSubmissionCompany, removeSubmission, renameCompany } from "./actions";

export const metadata: Metadata = { title: "Admin", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AdminPage({ searchParams }: { searchParams: Promise<{ cq?: string }> }) {
  const t = await getT();
  if (!(await isAdmin())) {
    return (
      <div className="mx-auto max-w-sm py-10">
        <h1 className="text-2xl font-semibold tracking-tight">{t.admin.loginTitle}</h1>
        <div className="mt-6">
          <LoginForm t={t.admin} />
        </div>
      </div>
    );
  }

  const cq = ((await searchParams).cq ?? "").toString().trim().slice(0, 100);
  const [queue, companyList, stats] = await Promise.all([loadQueue(), loadCompanies(cq), getAdminStats()]);
  const maxDay = Math.max(1, ...stats.daily.map((d) => d.n));

  return (
    <div>
      <PageHeader
        title={t.admin.title}
        actions={
          <form action={logout}>
            <button className="btn-secondary btn-sm">{t.admin.logout}</button>
          </form>
        }
      />

      <section className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-3">
          {[
            [t.admin.statPublished, stats.published],
            [t.admin.statFlagged, stats.flagged],
            [t.admin.statVerified, stats.verified],
            [t.admin.statWeek, stats.last7],
            [t.admin.statMonth, stats.last30],
            [t.admin.statReports, stats.reports30],
          ].map(([label, value]) => (
            <div key={label} className="flex flex-col-reverse bg-bg p-4">
              <dt className="text-xs text-fg-muted">{label}</dt>
              <dd className="num text-2xl font-semibold">{formatNumber(Number(value))}</dd>
            </div>
          ))}
        </dl>
        <div className="card card-pad">
          <p className="kicker">{t.admin.activity}</p>
          <div className="mt-4 flex h-28 items-end gap-1" aria-hidden="true">
            {stats.daily.length === 0 ? (
              <p className="text-sm text-fg-subtle">—</p>
            ) : (
              stats.daily.map((d) => (
                <span key={d.day} title={`${d.day}: ${d.n}`} className="flex-1 rounded-t-sm bg-accent-line hover:bg-accent" style={{ height: `${(d.n / maxDay) * 100}%` }} />
              ))
            )}
          </div>
        </div>
      </section>

      <section className="mt-12" aria-labelledby="queue">
        <SectionTitle id="queue" title={`${t.admin.queue} · ${queue.length}`} />
        {queue.length === 0 ? (
          <p className="card card-pad text-sm text-fg-muted">{t.admin.empty}</p>
        ) : (
          <div className="space-y-3">{queue.map((item) => <QueueItem key={item.id} item={item} t={t} />)}</div>
        )}
      </section>

      <section className="mt-12" aria-labelledby="companies">
        <SectionTitle id="companies" title={t.admin.companies} />
        <form method="get" className="mb-4 flex max-w-md gap-2">
          <label htmlFor="cq" className="sr-only">{t.nav.search}</label>
          <input id="cq" name="cq" defaultValue={cq} className="input h-10" placeholder={t.nav.search} />
          <button className="btn-secondary">{t.nav.search}</button>
        </form>
        <ul className="card divide-y divide-border">
          {companyList.map((c) => (
            <li key={c.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate font-medium">{c.name}</p>
                <p className="num text-xs text-fg-muted">/{c.slug} · {c.n}</p>
              </div>
              <form action={renameCompany} className="flex gap-2">
                <input type="hidden" name="id" value={c.id} />
                <label htmlFor={`rename-${c.id}`} className="sr-only">{t.admin.renameCompany}</label>
                <input id={`rename-${c.id}`} name="name" defaultValue={c.name} required minLength={2} maxLength={120} className="input h-9 text-sm" />
                <button className="btn-secondary btn-sm">{t.admin.rename}</button>
              </form>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}

type QueueEntry = Awaited<ReturnType<typeof loadQueue>>[number];

async function loadQueue() {
  const reported = db.select({ id: reports.submissionId }).from(reports);
  const rows = await db
    .select({
      id: submissions.id,
      title: submissions.jobTitle,
      salary: submissions.monthlySalaryEtb,
      experienceYears: submissions.experienceYears,
      status: submissions.status,
      verified: submissions.verified,
      pros: submissions.reviewPros,
      cons: submissions.reviewCons,
      createdAt: submissions.createdAt,
      companyName: companies.name,
    })
    .from(submissions)
    .innerJoin(companies, eq(companies.id, submissions.companyId))
    .where(or(eq(submissions.status, "flagged"), and(eq(submissions.status, "published"), inArray(submissions.id, reported))))
    .orderBy(desc(submissions.createdAt))
    .limit(100);

  const ids = rows.map((r) => r.id);
  const reportRows = ids.length
    ? await db
        .select({ submissionId: reports.submissionId, reason: reports.reason, details: reports.details })
        .from(reports)
        .where(inArray(reports.submissionId, ids))
    : [];
  const bySubmission = groupBy(reportRows, (r) => r.submissionId);
  return rows.map((r) => ({ ...r, reports: bySubmission.get(r.id) ?? [] }));
}

async function loadCompanies(q: string) {
  return db
    .select({ id: companies.id, name: companies.name, slug: companies.slug, n: count(submissions.id) })
    .from(companies)
    .leftJoin(submissions, eq(submissions.companyId, companies.id))
    .where(q ? ilike(companies.name, `%${q.replace(/[\\%_]/g, "\\$&")}%`) : undefined)
    .groupBy(companies.id)
    .orderBy(desc(companies.createdAt))
    .limit(30);
}

function QueueItem({ item, t }: { item: QueueEntry; t: Dictionary }) {
  const flagged = item.status === "flagged";
  return (
    <article className="card card-pad space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold">{item.companyName} · {item.title}</p>
          <p className="mt-0.5 text-sm text-fg-muted">
            {formatMonthYear(item.createdAt)} · {item.experienceYears} {t.common.years}
            {item.verified ? ` · ${t.common.verified}` : ""}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`badge ${flagged ? "border-bad/40 text-bad" : ""}`}>{item.status}</span>
          <p className="num text-lg font-semibold">{formatEtb(item.salary)}</p>
        </div>
      </div>
      {(item.pros || item.cons) && (
        <div className="grid gap-3 text-sm sm:grid-cols-2">
          {item.pros && <p><span className="font-medium text-good">{t.review.pros}: </span>{item.pros}</p>}
          {item.cons && <p><span className="font-medium text-bad">{t.review.cons}: </span>{item.cons}</p>}
        </div>
      )}
      {item.reports.length > 0 && (
        <div className="notice">
          <p className="font-medium">{t.admin.reports} · {item.reports.length}</p>
          <ul className="mt-1 list-disc pl-5">
            {item.reports.map((r, i) => (
              <li key={i}>
                {t.report.reasons[r.reason as keyof Dictionary["report"]["reasons"]] ?? r.reason}
                {r.details ? ` — ${r.details}` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <form action={approveSubmission}>
          <input type="hidden" name="id" value={item.id} />
          <button className="btn-primary btn-sm">{t.admin.approve}</button>
        </form>
        <form action={removeSubmission}>
          <input type="hidden" name="id" value={item.id} />
          <button className="btn btn-sm border border-bad/40 text-bad hover:bg-bad/5">{t.admin.remove}</button>
        </form>
        <form action={moveSubmissionCompany} className="ml-auto flex gap-2">
          <input type="hidden" name="id" value={item.id} />
          <label htmlFor={`move-${item.id}`} className="sr-only">{t.admin.moveCompany}</label>
          <input id={`move-${item.id}`} name="company" defaultValue={item.companyName} required minLength={2} maxLength={120} className="input h-8 text-sm" />
          <button className="btn-secondary btn-sm">{t.admin.move}</button>
        </form>
      </div>
    </article>
  );
}
