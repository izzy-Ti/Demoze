/** Stats for a group are only shown when it has at least this many published submissions. */
export const MIN_GROUP_SIZE = 5;

/** Verified submissions count this many times when computing ranges. */
export const VERIFIED_WEIGHT = 2;

export const LIMITS = {
  submissionsPerDay: 3,
  reportsPerDay: 10,
  verificationsPerDay: 3,
  adminLoginsPerHour: 10,
  reportsToAutoHide: 3,
  sameCompanyMonths: 12,
  minFillSeconds: 5,
  maxUploadBytes: 5 * 1024 * 1024,
  outlierFactor: 3,
  salaryMatchTolerance: 0.1,
} as const;

export const EMPLOYMENT_TYPES = ["full_time", "part_time", "contract", "intern"] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export const REPORT_REASONS = ["fake", "identifies", "defamatory", "wrong_company"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export const EXPERIENCE_BUCKETS = [
  { key: "0-2", min: 0, max: 2 },
  { key: "3-5", min: 3, max: 5 },
  { key: "6-10", min: 6, max: 10 },
  { key: "10+", min: 11, max: 50 },
] as const;

export const CITIES = [
  "Addis Ababa",
  "Adama",
  "Bahir Dar",
  "Dire Dawa",
  "Gondar",
  "Hawassa",
  "Jimma",
  "Mekelle",
  "Dessie",
  "Bishoftu",
  "Arba Minch",
  "Harar",
  "Remote",
] as const;

export const DEMO_DEVICE_HASH = "demo-seed-data";

/** Distribution charts need more data than plain ranges, so single people never stand out. */
export const HISTOGRAM_MIN = MIN_GROUP_SIZE * 2;

export const VOTES_PER_DAY = 60;

export const INDUSTRIES = [
  "banking",
  "telecom",
  "software",
  "ngo",
  "government",
  "education",
  "health",
  "manufacturing",
  "construction",
  "hospitality",
  "retail",
  "transport",
  "agriculture",
  "media",
  "other",
] as const;
export type Industry = (typeof INDUSTRIES)[number];
