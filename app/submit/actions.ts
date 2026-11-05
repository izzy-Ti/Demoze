"use server";

import { and, eq, gt, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { companies, reports, reviewVotes, submissions } from "@/lib/schema";
import { LIMITS, VOTES_PER_DAY } from "@/lib/constants";
import { checkFormToken } from "@/lib/crypto";
import { ensureDeviceHash } from "@/lib/device";
import { consume, DAY } from "@/lib/ratelimit";
import { isNull } from "drizzle-orm";
import { findOrCreateCompany } from "@/lib/companies";
import { normalizeTitle, titleToSlug } from "@/lib/normalize";
import { isOutlier } from "@/lib/stats-core";
import {
  fieldErrorsFrom,
  formDataToObject,
  reportSchema,
  submissionSchema,
  uuidSchema,
  type FieldErrors,
} from "@/lib/validation";
import type { ErrorKey } from "@/lib/i18n";

export type SubmitState =
  | { status: "idle" }
  | { status: "error"; error?: ErrorKey; fields?: FieldErrors }
  | {
      status: "ok";
      submissionId: string | null;
      companySlug: string;
      titleSlug: string;
      flagged: boolean;
    };

export async function submitSalary(_prev: SubmitState, formData: FormData): Promise<SubmitState> {
  try {
    // Honeypot: bots fill every field. Pretend success, store nothing.
    const honeypot = formData.get("website");
    if (typeof honeypot === "string" && honeypot.trim() !== "") {
      return { status: "ok", submissionId: null, companySlug: "", titleSlug: "", flagged: false };
    }

    const token = checkFormToken(formData.get("formToken")?.toString(), LIMITS.minFillSeconds);
    if (token === "too_fast") return { status: "error", error: "tooFast" };
    if (token === "invalid") return { status: "error", error: "expired" };

    const parsed = submissionSchema.safeParse(formDataToObject(formData));
    if (!parsed.success) return { status: "error", fields: fieldErrorsFrom(parsed.error) };
    const input = parsed.data;

    const deviceHash = await ensureDeviceHash();
    const company = await findOrCreateCompany(input.company);
    if (input.industry && !company.industry) {
      await db
        .update(companies)
        .set({ industry: input.industry })
        .where(and(eq(companies.id, company.id), isNull(companies.industry)));
    }

    // 1 submission per device per company per 12 months.
    const [dupe] = await db
      .select({ id: submissions.id })
      .from(submissions)
      .where(
        and(
          eq(submissions.deviceHash, deviceHash),
          eq(submissions.companyId, company.id),
          gt(submissions.createdAt, sql`now() - interval '12 months'`),
        ),
      )
      .limit(1);
    if (dupe) return { status: "error", error: "sameCompany" };

    // Max 3 submissions per device per day.
    const limit = await consume(`submit:${deviceHash}`, LIMITS.submissionsPerDay, DAY);
    if (!limit.allowed) return { status: "error", error: "dailyLimit" };

    const titleNormalized = normalizeTitle(input.jobTitle);

    // Outlier check against published salaries for the same title.
    const peers = await db
      .select({ salary: submissions.monthlySalaryEtb })
      .from(submissions)
      .where(
        and(eq(submissions.titleNormalized, titleNormalized), eq(submissions.status, "published")),
      );
    const flagged = isOutlier(
      input.monthlySalary,
      peers.map((p) => p.salary),
    );

    const [row] = await db
      .insert(submissions)
      .values({
        companyId: company.id,
        jobTitle: input.jobTitle,
        titleNormalized,
        monthlySalaryEtb: input.monthlySalary,
        bonusEtb: input.bonus ?? null,
        experienceYears: input.experienceYears,
        employmentType: input.employmentType,
        city: input.city ?? null,
        stillEmployed: input.stillEmployed,
        rating: input.rating ?? null,
        reviewPros: input.pros ?? null,
        reviewCons: input.cons ?? null,
        status: flagged ? "flagged" : "published",
        deviceHash,
      })
      .returning({ id: submissions.id });

    return {
      status: "ok",
      submissionId: row?.id ?? null,
      companySlug: company.slug,
      titleSlug: titleToSlug(titleNormalized),
      flagged,
    };
  } catch {
    // Never log the form contents.
    console.error("submitSalary failed");
    return { status: "error", error: "generic" };
  }
}

export type ReportState = { status: "idle" | "ok" | "error"; error?: ErrorKey };

export async function reportSubmission(_prev: ReportState, formData: FormData): Promise<ReportState> {
  try {
    const parsed = reportSchema.safeParse({
      submissionId: formData.get("submissionId"),
      reason: formData.get("reason"),
      details: formData.get("details"),
    });
    if (!parsed.success) return { status: "error", error: "generic" };
    const { submissionId, reason, details } = parsed.data;

    const deviceHash = await ensureDeviceHash();

    const [already] = await db
      .select({ id: reports.id })
      .from(reports)
      .where(and(eq(reports.submissionId, submissionId), eq(reports.deviceHash, deviceHash)))
      .limit(1);
    if (already) return { status: "error", error: "alreadyReported" };

    const limit = await consume(`report:${deviceHash}`, LIMITS.reportsPerDay, DAY);
    if (!limit.allowed) return { status: "error", error: "reportLimit" };

    const [target] = await db
      .select({ id: submissions.id })
      .from(submissions)
      .where(eq(submissions.id, submissionId))
      .limit(1);
    if (!target) return { status: "error", error: "generic" };

    await db.insert(reports).values({ submissionId, reason, details: details ?? null, deviceHash });

    // 3 reports auto-hide the review until an admin checks it.
    await db.execute(sql`
      update submissions set status = 'flagged'
      where id = ${submissionId} and status = 'published'
        and (select count(*) from reports where submission_id = ${submissionId}) >= ${LIMITS.reportsToAutoHide}
    `);

    return { status: "ok" };
  } catch {
    console.error("reportSubmission failed");
    return { status: "error", error: "generic" };
  }
}

export type VoteState = { voted: boolean; count: number };

/** "Helpful" vote: one per device per review, stored as salted device hash only. */
export async function voteHelpful(_prev: VoteState, formData: FormData): Promise<VoteState> {
  const id = uuidSchema.safeParse(formData.get("submissionId"));
  const current = Number(formData.get("count")) || 0;
  if (!id.success) return { voted: false, count: current };
  try {
    const deviceHash = await ensureDeviceHash();
    const limit = await consume(`vote:${deviceHash}`, VOTES_PER_DAY, DAY);
    if (!limit.allowed) return { voted: false, count: current };
    const inserted = await db
      .insert(reviewVotes)
      .values({ submissionId: id.data, deviceHash })
      .onConflictDoNothing()
      .returning({ id: reviewVotes.submissionId });
    if (inserted.length === 0) return { voted: true, count: current };
    const [row] = await db
      .update(submissions)
      .set({ helpfulCount: sql`${submissions.helpfulCount} + 1` })
      .where(eq(submissions.id, id.data))
      .returning({ n: submissions.helpfulCount });
    return { voted: true, count: row?.n ?? current + 1 };
  } catch {
    console.error("voteHelpful failed");
    return { voted: false, count: current };
  }
}
