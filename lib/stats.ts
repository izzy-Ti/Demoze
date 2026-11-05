import "server-only";
import { and, asc, count, desc, eq, gt, ilike, inArray, or, sql } from "drizzle-orm";
import { db } from "./db";
import { companies, reports, submissions } from "./schema";
import { MIN_GROUP_SIZE, EXPERIENCE_BUCKETS, DEMO_DEVICE_HASH } from "./constants";
import {
  experienceBucket,
  groupBy,
  histogram,
  percentileRank,
  summarize,
  type GroupStats,
} from "./stats-core";
import { companyKey } from "./normalize";

export { summarize, type GroupStats } from "./stats-core";

const published = eq(submissions.status, "published");
const PAGE_SIZE = 24;

function likePattern(q: string) {
  return `%${q.replace(/[\\%_]/g, (m) => "\\" + m)}%`;
}

/* ───────────────────────── Site level ───────────────────────── */

/** Aggregate counts only (no salary figures), safe to show at any size. */
export async function getSiteCounts() {
  const [row] = await db
    .select({
      salaries: count(),
      verified: sql<number>`count(*) filter (where ${submissions.verified})`.mapWith(Number),
      companies: sql<number>`count(distinct ${submissions.companyId})`.mapWith(Number),
      titles: sql<number>`count(distinct ${submissions.titleNormalized})`.mapWith(Number),
    })
    .from(submissions)
    .where(published);
  return row ?? { salaries: 0, verified: 0, companies: 0, titles: 0 };
}

/** Whole-market distribution for the home page chart (gated like every other group). */
export async function getMarketSnapshot() {
  const points = await db
    .select({ salary: submissions.monthlySalaryEtb, verified: submissions.verified })
    .from(submissions)
    .where(published);
  return { stats: summarize(points), histogram: histogram(points, 16) };
}

export type TitleSummary = { title: string; stats: GroupStats };

async function statsForTitles(titles: string[]): Promise<TitleSummary[]> {
  if (titles.length === 0) return [];
  const points = await db
    .select({
      title: submissions.titleNormalized,
      salary: submissions.monthlySalaryEtb,
      verified: submissions.verified,
    })
    .from(submissions)
    .where(and(published, inArray(submissions.titleNormalized, titles)));
  const byTitle = groupBy(points, (p) => p.title);
  return titles.map((title) => ({ title, stats: summarize(byTitle.get(title) ?? []) }));
}

/** Job titles with at least MIN_GROUP_SIZE salaries, highest median first. */
export async function getTopPayingTitles(limit = 8): Promise<TitleSummary[]> {
  const top = await db
    .select({ title: submissions.titleNormalized })
    .from(submissions)
    .where(published)
    .groupBy(submissions.titleNormalized)
    .having(sql`count(*) >= ${MIN_GROUP_SIZE}`)
    .orderBy(sql`percentile_cont(0.5) within group (order by ${submissions.monthlySalaryEtb}) desc`)
    .limit(limit);
  return statsForTitles(top.map((t) => t.title));
}

export type CompanyListItem = {
  name: string;
  slug: string;
  industry: string | null;
  count: number;
  rating: number | null;
  isDemo: boolean;
};

const companyListFields = {
  name: companies.name,
  slug: companies.slug,
  industry: companies.industry,
  count: count(submissions.id),
  rating: sql<number | null>`avg(${submissions.rating})`.mapWith((v) => (v == null ? null : Number(v))),
  isDemo: sql<boolean>`bool_or(${submissions.deviceHash} = ${DEMO_DEVICE_HASH})`.mapWith(Boolean),
};

export async function getRecentCompanies(limit = 8): Promise<CompanyListItem[]> {
  return db
    .select(companyListFields)
    .from(companies)
    .innerJoin(submissions, and(eq(submissions.companyId, companies.id), published))
    .groupBy(companies.id)
    .orderBy(desc(companies.createdAt))
    .limit(limit);
}

/* ───────────────────────── Directories ───────────────────────── */

export type CompanySort = "popular" | "rating" | "name";

export async function listCompanies(opts: { q?: string; industry?: string; sort?: CompanySort; page?: number }) {
  const page = Math.max(1, opts.page ?? 1);
  const where = and(
    opts.q ? ilike(companies.name, likePattern(opts.q)) : undefined,
    opts.industry ? eq(companies.industry, opts.industry) : undefined,
  );
  const order =
    opts.sort === "name"
      ? [asc(companies.name)]
      : opts.sort === "rating"
        ? [sql`avg(${submissions.rating}) desc nulls last`, desc(count(submissions.id))]
        : [desc(count(submissions.id)), asc(companies.name)];

  const rows = await db
    .select(companyListFields)
    .from(companies)
    .innerJoin(submissions, and(eq(submissions.companyId, companies.id), published))
    .where(where)
    .groupBy(companies.id)
    .orderBy(...order)
    .limit(PAGE_SIZE + 1)
    .offset((page - 1) * PAGE_SIZE);
  return { items: rows.slice(0, PAGE_SIZE), hasMore: rows.length > PAGE_SIZE, page };
}

export async function getIndustryCounts() {
  return db
    .select({ industry: companies.industry, n: sql<number>`count(distinct ${companies.id})`.mapWith(Number) })
    .from(companies)
    .innerJoin(submissions, and(eq(submissions.companyId, companies.id), published))
    .where(sql`${companies.industry} is not null`)
    .groupBy(companies.industry)
    .orderBy(desc(sql`2`));
}

export async function listTitles(opts: { q?: string; page?: number }) {
  const page = Math.max(1, opts.page ?? 1);
  const rows = await db
    .select({ title: submissions.titleNormalized, n: count() })
    .from(submissions)
    .where(and(published, opts.q ? ilike(submissions.titleNormalized, likePattern(opts.q)) : undefined))
    .groupBy(submissions.titleNormalized)
    .orderBy(desc(count()), asc(submissions.titleNormalized))
    .limit(PAGE_SIZE + 1)
    .offset((page - 1) * PAGE_SIZE);
  const items = rows.slice(0, PAGE_SIZE);
  const stats = await statsForTitles(items.map((r) => r.title));
  return {
    items: items.map((r, i) => ({ title: r.title, count: r.n, stats: stats[i]!.stats })),
    hasMore: rows.length > PAGE_SIZE,
    page,
  };
}

/* ───────────────────────── Company ───────────────────────── */

export async function getCompanyBySlug(slug: string) {
  const [row] = await db
    .select({ id: companies.id, name: companies.name, slug: companies.slug, industry: companies.industry, city: companies.city })
    .from(companies)
    .where(eq(companies.slug, slug))
    .limit(1);
  return row ?? null;
}

/** Fields that are safe to show publicly. Never select device_hash or exact dates for display. */
export type PublicReview = {
  id: string;
  title: string;
  salary: number;
  experienceYears: number;
  employmentType: string | null;
  stillEmployed: boolean;
  rating: number | null;
  pros: string | null;
  cons: string | null;
  verified: boolean;
  helpful: number;
  createdAt: Date;
};

export type ReviewSort = "helpful" | "recent";

export async function getCompanyPage(companyId: string, sort: ReviewSort = "helpful") {
  const rows = await db
    .select({
      id: submissions.id,
      title: submissions.titleNormalized,
      salary: submissions.monthlySalaryEtb,
      experienceYears: submissions.experienceYears,
      employmentType: submissions.employmentType,
      stillEmployed: submissions.stillEmployed,
      rating: submissions.rating,
      pros: submissions.reviewPros,
      cons: submissions.reviewCons,
      verified: submissions.verified,
      helpful: submissions.helpfulCount,
      createdAt: submissions.createdAt,
      isDemo: sql<boolean>`${submissions.deviceHash} = ${DEMO_DEVICE_HASH}`,
    })
    .from(submissions)
    .where(and(eq(submissions.companyId, companyId), published))
    .orderBy(
      ...(sort === "recent"
        ? [desc(submissions.createdAt)]
        : [desc(submissions.helpfulCount), desc(submissions.verified), desc(submissions.createdAt)]),
    );

  const overall = summarize(rows);
  const byTitle = [...groupBy(rows, (r) => r.title)].map(([title, list]) => ({ title, stats: summarize(list) }));
  const shownTitles = byTitle
    .filter((t) => t.stats.enough)
    .sort((a, b) => (b.stats.enough && a.stats.enough ? b.stats.median - a.stats.median : 0));

  const ratings = rows.map((r) => r.rating).filter((r): r is number => r != null);
  const ratingDist = [5, 4, 3, 2, 1].map((star) => ({
    star,
    share: ratings.length ? ratings.filter((r) => r === star).length / ratings.length : 0,
  }));

  const recommend = rows.filter((r) => r.stillEmployed).length;

  return {
    overall,
    histogram: histogram(rows),
    titles: shownTitles,
    hiddenTitleCount: byTitle.length - shownTitles.length,
    avgRating: ratings.length ? ratings.reduce((a, b) => a + b, 0) / ratings.length : null,
    ratingCount: ratings.length,
    ratingDist,
    stillEmployedShare: rows.length ? recommend / rows.length : null,
    reviews: rows.slice(0, 100).map(({ isDemo: _d, ...r }) => r) as PublicReview[],
    reviewCount: rows.filter((r) => r.pros || r.cons).length,
    isDemo: rows.some((r) => r.isDemo),
  };
}

/* ───────────────────────── Job title ───────────────────────── */

async function titleRows(title: string) {
  return db
    .select({
      salary: submissions.monthlySalaryEtb,
      verified: submissions.verified,
      experienceYears: submissions.experienceYears,
      city: submissions.city,
      companyName: companies.name,
      companySlug: companies.slug,
    })
    .from(submissions)
    .innerJoin(companies, eq(companies.id, submissions.companyId))
    .where(and(eq(submissions.titleNormalized, title), published));
}

function byExperience(rows: { salary: number; verified: boolean; experienceYears: number }[]) {
  const buckets = groupBy(rows, (r) => experienceBucket(r.experienceYears));
  return EXPERIENCE_BUCKETS.map((b) => ({ bucket: b.key, stats: summarize(buckets.get(b.key) ?? []) }));
}

export async function getTitlePage(title: string) {
  const rows = await titleRows(title);
  const topCompanies = [...groupBy(rows, (r) => r.companySlug)]
    .map(([slug, list]) => ({ slug, name: list[0]!.companyName, stats: summarize(list) }))
    .filter((c) => c.stats.enough)
    .sort((a, b) => (a.stats.enough && b.stats.enough ? b.stats.median - a.stats.median : 0))
    .slice(0, 10);
  const cities = [...groupBy(rows.filter((r) => r.city), (r) => r.city!)]
    .map(([city, list]) => ({ city, stats: summarize(list) }))
    .filter((c) => c.stats.enough)
    .sort((a, b) => (a.stats.enough && b.stats.enough ? b.stats.median - a.stats.median : 0));

  return {
    overall: summarize(rows),
    histogram: histogram(rows),
    byExperience: byExperience(rows),
    topCompanies,
    cities,
    total: rows.length,
    companyCount: new Set(rows.map((r) => r.companySlug)).size,
  };
}

/** "Compare my salary": nothing about the visitor is stored. */
export async function compareSalary(title: string, salary: number, years?: number) {
  const rows = await titleRows(title);
  const overall = summarize(rows);
  if (!overall.enough) return { title, overall, enough: false as const };

  const bucketKey = years != null ? experienceBucket(years) : null;
  const bucketRows = bucketKey ? rows.filter((r) => experienceBucket(r.experienceYears) === bucketKey) : [];
  const bucket = bucketKey ? summarize(bucketRows) : null;

  return {
    title,
    enough: true as const,
    overall,
    histogram: histogram(rows),
    percentile: percentileRank(salary, rows.map((r) => r.salary)),
    bucketKey,
    bucket,
    bucketPercentile: bucket?.enough ? percentileRank(salary, bucketRows.map((r) => r.salary)) : null,
  };
}

export async function getCompanyTitleStats(companyId: string, title: string) {
  const rows = await db
    .select({ salary: submissions.monthlySalaryEtb, verified: submissions.verified })
    .from(submissions)
    .where(and(eq(submissions.companyId, companyId), eq(submissions.titleNormalized, title), published));
  return summarize(rows);
}

export async function getCompanyStats(companyId: string) {
  const rows = await db
    .select({ salary: submissions.monthlySalaryEtb, verified: submissions.verified })
    .from(submissions)
    .where(and(eq(submissions.companyId, companyId), published));
  return summarize(rows);
}

export async function getTitleStats(title: string) {
  const rows = await db
    .select({ salary: submissions.monthlySalaryEtb, verified: submissions.verified })
    .from(submissions)
    .where(and(eq(submissions.titleNormalized, title), published));
  return summarize(rows);
}

/* ───────────────────────── Search ───────────────────────── */

export async function searchCompanies(q: string, limit = 10) {
  const key = companyKey(q);
  return db
    .select({ name: companies.name, slug: companies.slug, industry: companies.industry, n: count(submissions.id) })
    .from(companies)
    .leftJoin(submissions, and(eq(submissions.companyId, companies.id), published))
    .where(
      or(
        ilike(companies.name, likePattern(q.trim())),
        key ? ilike(sql`replace(${companies.slug}, '-', '')`, likePattern(key)) : undefined,
      ),
    )
    .groupBy(companies.id)
    .orderBy(desc(count(submissions.id)))
    .limit(limit);
}

export async function searchTitles(normalizedQ: string, limit = 10) {
  if (!normalizedQ) return [];
  return db
    .select({ title: submissions.titleNormalized, n: count() })
    .from(submissions)
    .where(and(published, ilike(submissions.titleNormalized, likePattern(normalizedQ))))
    .groupBy(submissions.titleNormalized)
    .orderBy(desc(count()))
    .limit(limit);
}

/* ───────────────────────── Admin ───────────────────────── */

export async function getAdminStats() {
  const [row] = await db
    .select({
      published: sql<number>`count(*) filter (where ${submissions.status} = 'published')`.mapWith(Number),
      flagged: sql<number>`count(*) filter (where ${submissions.status} = 'flagged')`.mapWith(Number),
      removed: sql<number>`count(*) filter (where ${submissions.status} = 'removed')`.mapWith(Number),
      verified: sql<number>`count(*) filter (where ${submissions.verified})`.mapWith(Number),
      last7: sql<number>`count(*) filter (where ${submissions.createdAt} > now() - interval '7 days')`.mapWith(Number),
      last30: sql<number>`count(*) filter (where ${submissions.createdAt} > now() - interval '30 days')`.mapWith(Number),
    })
    .from(submissions);
  const [rep] = await db
    .select({ n: count() })
    .from(reports)
    .where(gt(reports.createdAt, sql`now() - interval '30 days'`));
  const daily = await db
    .select({
      day: sql<string>`to_char(date_trunc('day', ${submissions.createdAt}), 'YYYY-MM-DD')`,
      n: count(),
    })
    .from(submissions)
    .where(gt(submissions.createdAt, sql`now() - interval '30 days'`))
    .groupBy(sql`1`)
    .orderBy(sql`1`);
  return { ...(row ?? { published: 0, flagged: 0, removed: 0, verified: 0, last7: 0, last30: 0 }), reports30: rep?.n ?? 0, daily };
}
