import { NextResponse, type NextRequest } from "next/server";
import { searchCompanies } from "@/lib/stats";

export const dynamic = "force-dynamic";

/** Company autocomplete for the submit form. Returns names and slugs only. */
export async function GET(request: NextRequest) {
  const q = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 120);
  if (q.length < 2) return NextResponse.json({ companies: [] });
  try {
    const rows = await searchCompanies(q, 8);
    return NextResponse.json(
      { companies: rows.map((r) => ({ name: r.name, slug: r.slug })) },
      { headers: { "cache-control": "private, max-age=60" } },
    );
  } catch {
    return NextResponse.json({ companies: [] }, { status: 200 });
  }
}
