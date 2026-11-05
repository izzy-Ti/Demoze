import type { MetadataRoute } from "next";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { companies, submissions } from "@/lib/schema";
import { env } from "@/lib/env";
import { titleToSlug } from "@/lib/normalize";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = env.SITE_URL();
  const staticPages = ["", "/companies", "/jobs", "/compare", "/calculator", "/submit", "/about"].map((p) => ({ url: `${base}${p}` }));
  try {
    const [companyRows, titleRows] = await Promise.all([
      db
        .selectDistinct({ slug: companies.slug })
        .from(companies)
        .innerJoin(submissions, and(eq(submissions.companyId, companies.id), eq(submissions.status, "published")))
        .limit(5000),
      db
        .selectDistinct({ title: submissions.titleNormalized })
        .from(submissions)
        .where(eq(submissions.status, "published"))
        .orderBy(sql`1`)
        .limit(5000),
    ]);
    return [
      ...staticPages,
      ...companyRows.map((c) => ({ url: `${base}/company/${c.slug}` })),
      ...titleRows.map((t) => ({ url: `${base}/jobs/${titleToSlug(t.title)}` })),
    ];
  } catch {
    return staticPages;
  }
}
