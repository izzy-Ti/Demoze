"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { companies, reports, submissions } from "@/lib/schema";
import { checkPassword, endAdminSession, requireAdmin, startAdminSession } from "@/lib/admin-auth";
import { ensureDeviceHash } from "@/lib/device";
import { consume, HOUR } from "@/lib/ratelimit";
import { LIMITS } from "@/lib/constants";
import { findOrCreateCompany } from "@/lib/companies";
import { cleanDisplayName, companySlug } from "@/lib/normalize";

export type LoginState = { error?: "wrongPassword" | "tooMany" };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const device = await ensureDeviceHash();
  const limit = await consume(`admin-login:${device}`, LIMITS.adminLoginsPerHour, HOUR);
  if (!limit.allowed) return { error: "tooMany" };
  const password = formData.get("password")?.toString() ?? "";
  if (!checkPassword(password)) return { error: "wrongPassword" };
  await startAdminSession();
  revalidatePath("/admin");
  return {};
}

export async function logout() {
  await endAdminSession();
  revalidatePath("/admin");
}

const idSchema = z.uuid();
const nameSchema = z.string().trim().min(2).max(120);

function refresh() {
  revalidatePath("/", "layout");
}

export async function approveSubmission(formData: FormData) {
  await requireAdmin();
  const id = idSchema.parse(formData.get("id"));
  await db.update(submissions).set({ status: "published" }).where(eq(submissions.id, id));
  // Clear handled reports so it is not re-hidden by old reports.
  await db.delete(reports).where(eq(reports.submissionId, id));
  refresh();
}

export async function removeSubmission(formData: FormData) {
  await requireAdmin();
  const id = idSchema.parse(formData.get("id"));
  await db.update(submissions).set({ status: "removed" }).where(eq(submissions.id, id));
  refresh();
}

/** Fixes a "wrong company" or typo: moves the submission to an existing or new company. */
export async function moveSubmissionCompany(formData: FormData) {
  await requireAdmin();
  const id = idSchema.parse(formData.get("id"));
  const name = nameSchema.parse(formData.get("company"));
  const company = await findOrCreateCompany(name);
  await db.update(submissions).set({ companyId: company.id }).where(eq(submissions.id, id));
  refresh();
}

/** Renames a company. The slug follows the name unless another company already uses it. */
export async function renameCompany(formData: FormData) {
  await requireAdmin();
  const id = idSchema.parse(formData.get("id"));
  const name = cleanDisplayName(nameSchema.parse(formData.get("name")));
  const slug = companySlug(name);
  const [clash] = await db.select({ id: companies.id }).from(companies).where(eq(companies.slug, slug)).limit(1);
  await db
    .update(companies)
    .set(clash && clash.id !== id ? { name } : { name, slug })
    .where(eq(companies.id, id));
  refresh();
}
