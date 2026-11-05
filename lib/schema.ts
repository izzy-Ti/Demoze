import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const companies = pgTable("companies", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  slug: text("slug").unique().notNull(),
  industry: text("industry"),
  city: text("city"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const submissions = pgTable(
  "submissions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    companyId: uuid("company_id")
      .references(() => companies.id)
      .notNull(),
    jobTitle: text("job_title").notNull(),
    titleNormalized: text("title_normalized").notNull(),
    monthlySalaryEtb: integer("monthly_salary_etb").notNull(),
    bonusEtb: integer("bonus_etb"),
    experienceYears: smallint("experience_years").notNull(),
    employmentType: text("employment_type"),
    city: text("city"),
    stillEmployed: boolean("still_employed").default(true).notNull(),
    rating: smallint("rating"),
    reviewPros: text("review_pros"),
    reviewCons: text("review_cons"),
    verified: boolean("verified").default(false).notNull(),
    helpfulCount: integer("helpful_count").default(0).notNull(),
    status: text("status").default("published").notNull(),
    deviceHash: text("device_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    check("salary_range", sql`${t.monthlySalaryEtb} between 500 and 2000000`),
    check("experience_range", sql`${t.experienceYears} between 0 and 50`),
    check("rating_range", sql`${t.rating} between 1 and 5`),
    check("pros_length", sql`char_length(${t.reviewPros}) <= 1000`),
    check("cons_length", sql`char_length(${t.reviewCons}) <= 1000`),
    check("status_values", sql`${t.status} in ('published','flagged','removed')`),
    check(
      "employment_type_values",
      sql`${t.employmentType} in ('full_time','part_time','contract','intern')`,
    ),
    index("submissions_company_idx").on(t.companyId, t.status),
    index("submissions_title_idx").on(t.titleNormalized, t.status),
    index("submissions_device_idx").on(t.deviceHash, t.createdAt),
  ],
);

export const reports = pgTable(
  "reports",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    submissionId: uuid("submission_id")
      .references(() => submissions.id, { onDelete: "cascade" })
      .notNull(),
    reason: text("reason").notNull(),
    details: text("details"),
    deviceHash: text("device_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [index("reports_submission_idx").on(t.submissionId)],
);

/** One "helpful" vote per device per review. Only the salted device hash is stored. */
export const reviewVotes = pgTable(
  "review_votes",
  {
    submissionId: uuid("submission_id")
      .references(() => submissions.id, { onDelete: "cascade" })
      .notNull(),
    deviceHash: text("device_hash").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.submissionId, t.deviceHash] })],
);

export const rateLimits = pgTable("rate_limits", {
  key: text("key").primaryKey(),
  count: integer("count").notNull(),
  windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
});

export type Company = typeof companies.$inferSelect;
export type Submission = typeof submissions.$inferSelect;
