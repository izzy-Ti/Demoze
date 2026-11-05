import { test } from "node:test";
import assert from "node:assert/strict";
import {
  companiesMatch,
  companyKey,
  companySlug,
  displayTitle,
  normalizeTitle,
  slugToTitle,
  titleToSlug,
} from "./normalize";
import { containsContactInfo } from "./privacy";
import { formatBand, formatEtb, salaryBand } from "./format";
import { experienceBucket, isOutlier, summarize, weightedQuantile } from "./stats-core";
import { matchPayslip, sniffMime, type PayslipResult } from "./verify";
import { submissionSchema, fieldErrorsFrom } from "./validation";
import { MIN_GROUP_SIZE } from "./constants";

test("company slugs and duplicate keys", () => {
  assert.equal(companySlug("Ethio Telecom"), "ethio-telecom");
  assert.equal(companySlug("Dashen Bank S.C."), "dashen-bank");
  assert.equal(companySlug("Kifiya Financial Technology PLC"), "kifiya-financial-technology");
  assert.equal(companyKey("Ethio Telecom"), companyKey("Ethiotelecom"));
  assert.equal(companyKey("ethio-telecom"), "ethiotelecom");
});

test("job title normalization", () => {
  assert.equal(normalizeTitle("Sr. Software Dev"), "senior software developer");
  assert.equal(normalizeTitle("  software   DEVELOPER "), "software developer");
  assert.equal(titleToSlug("software developer"), "software-developer");
  assert.equal(slugToTitle("software-developer"), "software developer");
  assert.equal(displayTitle("hr officer"), "HR Officer");
});

test("company fuzzy match for verification", () => {
  assert.ok(companiesMatch("ETHIO TELECOM", "Ethio Telecom"));
  assert.ok(companiesMatch("Ethiotelecom S.C.", "Ethio Telecom"));
  assert.ok(companiesMatch("Commercial Bank of Ethiopia", "Commercial Bank Of Ethiopia S.C."));
  assert.ok(!companiesMatch("Dashen Bank", "Awash Bank"));
  assert.ok(!companiesMatch("Safaricom Ethiopia", "Ethio Telecom"));
});

test("contact info is detected", () => {
  assert.ok(containsContactInfo("call me 0911223344"));
  assert.ok(containsContactInfo("+251 91 122 3344"));
  assert.ok(containsContactInfo("mail abebe@gmail.com"));
  assert.ok(containsContactInfo("abebe (at) gmail (dot) com"));
  assert.ok(containsContactInfo("telegram @abebe_k"));
  assert.ok(!containsContactInfo("Great team, 5 day week, salary paid on the 25th."));
  assert.ok(!containsContactInfo("Pay rose 20% in 2024"));
});

test("salary bands and formatting", () => {
  assert.deepEqual(salaryBand(22000), [20000, 25000]);
  assert.equal(formatBand(22000), "20,000 – 25,000 ETB");
  assert.equal(formatEtb(1234567), "1,234,567 ETB");
  assert.deepEqual(salaryBand(7500), [6000, 8000]);
});

test("privacy gate: fewer than MIN_GROUP_SIZE shows no stats", () => {
  const four = [1, 2, 3, 4].map((i) => ({ salary: i * 10000, verified: false }));
  const s = summarize(four);
  assert.equal(s.enough, false);
  assert.ok(!("median" in s));
  const five = [...four, { salary: 50000, verified: false }];
  const s5 = summarize(five);
  assert.equal(MIN_GROUP_SIZE, 5);
  assert.equal(s5.enough, true);
  if (s5.enough) {
    assert.equal(s5.median, 30000);
    // Interpolated low/high are not an individual's exact salary.
    assert.notEqual(s5.low, 10000);
    assert.notEqual(s5.high, 50000);
  }
});

test("verified salaries carry more weight", () => {
  const pts = [
    { salary: 10000, verified: false },
    { salary: 20000, verified: false },
    { salary: 30000, verified: true },
  ];
  // expanded: 10k, 20k, 30k, 30k -> median 25k
  assert.equal(weightedQuantile(pts, 0.5), 25000);
});

test("experience buckets", () => {
  assert.equal(experienceBucket(0), "0-2");
  assert.equal(experienceBucket(2), "0-2");
  assert.equal(experienceBucket(5), "3-5");
  assert.equal(experienceBucket(10), "6-10");
  assert.equal(experienceBucket(11), "10+");
});

test("outlier detection", () => {
  const peers = [20000, 22000, 25000, 21000, 23000];
  assert.ok(isOutlier(100000, peers));
  assert.ok(isOutlier(5000, peers));
  assert.ok(!isOutlier(40000, peers));
  assert.ok(!isOutlier(1000000, peers.slice(0, 4)), "needs 5+ peers");
});

const base: PayslipResult = {
  company: "Ethio Telecom",
  title: "Engineer",
  monthly_amount: 30000,
  net_amount: 24000,
  currency: "ETB",
  month: "2026-09",
  appears_authentic: true,
  reason: "Looks like a standard payslip",
};
const sub = { companyName: "Ethio Telecom", monthlySalaryEtb: 31000 };

test("payslip matching", () => {
  assert.equal(matchPayslip(base, sub), "verified");
  assert.equal(matchPayslip({ ...base, monthly_amount: 40000, net_amount: null }, sub), "no_match");
  assert.equal(matchPayslip({ ...base, company: "Awash Bank" }, sub), "no_match");
  assert.equal(matchPayslip({ ...base, appears_authentic: false }, sub), "no_match");
  assert.equal(matchPayslip({ ...base, currency: "USD" }, sub), "no_match");
  assert.equal(matchPayslip({ ...base, currency: "Birr" }, sub), "verified");
  assert.equal(
    matchPayslip({ ...base, monthly_amount: 50000, net_amount: 30500 }, sub),
    "verified",
    "net pay within 10% also matches",
  );
  assert.equal(
    matchPayslip({ ...base, company: null, monthly_amount: null, net_amount: null }, sub),
    "unreadable",
  );
});

test("file type sniffing", () => {
  assert.equal(sniffMime(new Uint8Array([0xff, 0xd8, 0xff, 0xe0])), "image/jpeg");
  assert.equal(sniffMime(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])), "image/png");
  assert.equal(sniffMime(new TextEncoder().encode("%PDF-1.7")), "application/pdf");
  assert.equal(sniffMime(new TextEncoder().encode("<html>")), null);
});

test("submission validation", () => {
  const ok = submissionSchema.safeParse({
    company: "Ethio Telecom",
    jobTitle: "Software Developer",
    monthlySalary: "25,000",
    bonus: "",
    experienceYears: "3",
    employmentType: "full_time",
    city: "",
    stillEmployed: "on",
    rating: "4",
    pros: "Nice team",
    cons: "",
  });
  assert.ok(ok.success);
  if (ok.success) {
    assert.equal(ok.data.monthlySalary, 25000);
    assert.equal(ok.data.bonus, undefined);
    assert.equal(ok.data.stillEmployed, true);
  }

  const bad = submissionSchema.safeParse({
    company: "E",
    jobTitle: "Dev",
    monthlySalary: "100",
    experienceYears: "60",
    employmentType: "boss",
    stillEmployed: undefined,
    pros: "call 0911223344",
  });
  assert.ok(!bad.success);
  if (!bad.success) {
    const errs = fieldErrorsFrom(bad.error);
    assert.equal(errs.company, "companyLength");
    assert.equal(errs.monthlySalary, "salaryRange");
    assert.equal(errs.experienceYears, "experienceRange");
    assert.equal(errs.employmentType, "employmentType");
    assert.equal(errs.pros, "contactInfo");
  }
});
