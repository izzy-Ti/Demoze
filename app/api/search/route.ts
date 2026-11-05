import { NextResponse, type NextRequest } from "next/server";
import { searchCompanies, searchTitles } from "@/lib/stats";
import { displayTitle, normalizeTitle, titleToSlug } from "@/lib/normalize";

export const dynamic = "force-dynamic";

/** Instant search for the command palette and hero search. Names and counts only. */
export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 100);
  if (q.length < 2) return NextResponse.json({ companies: [], titles: [] });
  try {
    const [companies, titles] = await Promise.all([searchCompanies(q, 5), searchTitles(normalizeTitle(q), 5)]);
    return NextResponse.json(
      {
        companies: companies
          .filter((c) => c.n > 0)
          .map((c) => ({ label: c.name, href: `/company/${c.slug}`, count: c.n, industry: c.industry })),
        titles: titles.map((t) => ({ label: displayTitle(t.title), href: `/jobs/${titleToSlug(t.title)}`, count: t.n })),
      },
      { headers: { "cache-control": "private, max-age=30" } },
    );
  } catch {
    return NextResponse.json({ companies: [], titles: [] });
  }
}
