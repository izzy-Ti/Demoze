import "server-only";
import { eq, sql } from "drizzle-orm";
import { db } from "./db";
import { companies } from "./schema";
import { cleanDisplayName, companyKey, companySlug } from "./normalize";

/** Finds a company by its spacing-insensitive key, so "Ethiotelecom" reuses "Ethio Telecom". */
export async function findCompanyByName(name: string) {
  const key = companyKey(name);
  const [row] = await db
    .select()
    .from(companies)
    .where(sql`replace(${companies.slug}, '-', '') = ${key}`)
    .limit(1);
  return row ?? null;
}

export async function findOrCreateCompany(rawName: string) {
  const existing = await findCompanyByName(rawName);
  if (existing) return existing;

  const name = cleanDisplayName(rawName);
  const slug = companySlug(name);
  const [created] = await db
    .insert(companies)
    .values({ name, slug })
    .onConflictDoNothing({ target: companies.slug })
    .returning();
  if (created) return created;

  // Lost a race with a concurrent insert: read it back.
  const [row] = await db.select().from(companies).where(eq(companies.slug, slug)).limit(1);
  if (!row) throw new Error("Company could not be created");
  return row;
}
