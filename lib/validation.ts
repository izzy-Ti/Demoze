import { z } from "zod";
import { EMPLOYMENT_TYPES, INDUSTRIES, REPORT_REASONS } from "./constants";
import { containsContactInfo } from "./privacy";
import type { ErrorKey } from "./i18n";

/**
 * Shared Zod schemas, used by the browser form and again on the server.
 * Error messages are i18n keys from Dictionary["errors"].
 */

const e = (key: ErrorKey) => key;

const emptyToUndefined = (v: unknown) =>
  typeof v === "string" && v.trim() === "" ? undefined : v;

const optionalInt = (min: number, max: number, key: ErrorKey) =>
  z.preprocess(
    (v) => {
      const cleaned = emptyToUndefined(typeof v === "string" ? v.replace(/[,\s]/g, "") : v);
      return cleaned === undefined ? undefined : Number(cleaned);
    },
    z.number(e(key)).int(e(key)).min(min, e(key)).max(max, e(key)).optional(),
  );

const requiredInt = (min: number, max: number, key: ErrorKey) =>
  z.preprocess(
    (v) => {
      const cleaned = emptyToUndefined(typeof v === "string" ? v.replace(/[,\s]/g, "") : v);
      return cleaned === undefined ? undefined : Number(cleaned);
    },
    z.number(e(key)).int(e(key)).min(min, e(key)).max(max, e(key)),
  );

const reviewText = z.preprocess(
  emptyToUndefined,
  z
    .string()
    .trim()
    .max(1000, e("textLength"))
    .refine((t) => !containsContactInfo(t), e("contactInfo"))
    .optional(),
);

export const submissionSchema = z.object({
  company: z
    .string(e("companyLength"))
    .trim()
    .min(2, e("companyLength"))
    .max(120, e("companyLength"))
    .refine((t) => !containsContactInfo(t), e("contactInfo")),
  jobTitle: z
    .string(e("titleLength"))
    .trim()
    .min(2, e("titleLength"))
    .max(100, e("titleLength"))
    .refine((t) => !containsContactInfo(t), e("contactInfo")),
  monthlySalary: requiredInt(500, 2_000_000, "salaryRange"),
  bonus: optionalInt(0, 10_000_000, "bonusRange"),
  experienceYears: requiredInt(0, 50, "experienceRange"),
  employmentType: z.enum(EMPLOYMENT_TYPES, e("employmentType")),
  city: z.preprocess(
    emptyToUndefined,
    z
      .string()
      .trim()
      .max(60, e("cityLength"))
      .refine((t) => !containsContactInfo(t), e("contactInfo"))
      .optional(),
  ),
  industry: z.preprocess(emptyToUndefined, z.enum(INDUSTRIES).optional()),
  stillEmployed: z.preprocess((v) => v === "on" || v === "true" || v === true, z.boolean()),
  rating: optionalInt(1, 5, "ratingRange"),
  pros: reviewText,
  cons: reviewText,
});

export type SubmissionInput = z.infer<typeof submissionSchema>;

export const SUBMISSION_FIELDS = [
  "company",
  "jobTitle",
  "monthlySalary",
  "bonus",
  "experienceYears",
  "employmentType",
  "city",
  "industry",
  "stillEmployed",
  "rating",
  "pros",
  "cons",
] as const;

export type FieldErrors = Partial<Record<(typeof SUBMISSION_FIELDS)[number], ErrorKey>>;

/** Collects the first error key per field. */
export function fieldErrorsFrom(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const field = issue.path[0] as keyof FieldErrors | undefined;
    if (field && !out[field]) out[field] = issue.message as ErrorKey;
  }
  return out;
}

export function formDataToObject(fd: FormData): Record<string, unknown> {
  const obj: Record<string, unknown> = {};
  for (const field of SUBMISSION_FIELDS) {
    const v = fd.get(field);
    obj[field] = typeof v === "string" ? v : undefined;
  }
  return obj;
}

export const reportSchema = z.object({
  submissionId: z.uuid(),
  reason: z.enum(REPORT_REASONS),
  details: z.preprocess(emptyToUndefined, z.string().trim().max(500).optional()),
});

export const uuidSchema = z.uuid();
