/**
 * DEMO DATA ONLY. Adds 3 fake companies and 12 fake submissions, all clearly
 * marked "(Demo data)" and tagged with device_hash = DEMO_DEVICE_HASH.
 *
 *   npm run db:seed     -> (re)create demo data
 *   npm run db:unseed   -> remove all demo data
 *
 * Remove demo data once real submissions arrive.
 */
import { config } from "dotenv";
config({ path: ".env.local" });
config();
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { eq, inArray, like } from "drizzle-orm";
import { companies, submissions } from "../lib/schema";
import { DEMO_DEVICE_HASH } from "../lib/constants";
import { companySlug, normalizeTitle } from "../lib/normalize";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set. Copy .env.example to .env first.");
  process.exit(1);
}
const db = drizzle(neon(url));

const DEMO_COMPANIES = [
  { name: "Abyssinia Demo Bank (Demo data)", industry: "banking", city: "Addis Ababa" },
  { name: "Selam Demo Telecom (Demo data)", industry: "telecom", city: "Addis Ababa" },
  { name: "Entoto Demo Tech (Demo data)", industry: "software", city: "Addis Ababa" },
];

type Seed = [company: number, title: string, salary: number, years: number, verified: boolean, rating: number, pros?: string, cons?: string];

const DEMO_SUBMISSIONS: Seed[] = [
  [0, "Software Developer", 38000, 3, true, 4, "Good training budget and stable pay.", "Slow approval processes."],
  [0, "Software Developer", 45000, 5, false, 4, "Modern core banking projects."],
  [0, "Accountant", 22000, 2, true, 3, "Clear career path.", "Long hours at month end."],
  [0, "Accountant", 26000, 4, false, 3],
  [0, "Bank Teller", 14000, 1, false, 3, "Friendly branch team.", "Busy and repetitive."],
  [1, "Software Developer", 52000, 6, true, 4, "Big systems, lots to learn."],
  [1, "Software Developer", 41000, 2, false, 5],
  [1, "Network Engineer", 48000, 7, false, 4, "Good allowances.", "Field work far from the city."],
  [1, "Customer Service Representative", 12000, 1, false, 2, undefined, "Strict shift schedule."],
  [2, "Software Developer", 60000, 8, true, 5, "Remote friendly, paid in time.", "Small team, many hats."],
  [2, "UI/UX Designer", 35000, 3, false, 4, "Creative freedom."],
  [2, "Data Analyst", 30000, 2, false, 4],
];

async function removeDemo() {
  await db.delete(submissions).where(eq(submissions.deviceHash, DEMO_DEVICE_HASH));
  await db.delete(companies).where(like(companies.name, "%(Demo data)"));
}

async function main() {
  await removeDemo();
  if (process.argv.includes("--remove")) {
    console.log("Demo data removed.");
    return;
  }

  const created = await db
    .insert(companies)
    .values(DEMO_COMPANIES.map((c) => ({ ...c, slug: companySlug(c.name) })))
    .returning({ id: companies.id, name: companies.name });

  const now = Date.now();
  await db.insert(submissions).values(
    DEMO_SUBMISSIONS.map(([ci, title, salary, years, verified, rating, pros, cons], i) => ({
      companyId: created[ci]!.id,
      jobTitle: title,
      titleNormalized: normalizeTitle(title),
      monthlySalaryEtb: salary,
      experienceYears: years,
      employmentType: "full_time",
      city: "Addis Ababa",
      stillEmployed: i % 4 !== 0,
      rating,
      reviewPros: pros ?? null,
      reviewCons: cons ?? null,
      verified,
      status: "published",
      deviceHash: DEMO_DEVICE_HASH,
      createdAt: new Date(now - i * 9 * 24 * 60 * 60 * 1000),
    })),
  );

  const ids = created.map((c) => c.id);
  const check = await db.select({ id: submissions.id }).from(submissions).where(inArray(submissions.companyId, ids));
  console.log(`Seeded ${created.length} demo companies and ${check.length} demo submissions.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
