# Demoze

Anonymous salary and job reviews for Ethiopia. People share what they earn (company, job title, monthly salary in ETB, experience, optional review). Visitors search a company or job title and see real salary ranges. An optional payslip check, read by Google Gemini and discarded immediately, earns a **Verified** badge.

**Stack:** Next.js 15 (App Router, TypeScript strict) · Tailwind CSS v4 · Neon Postgres · Drizzle ORM · Zod · Google Gemini

---

## 1. Setup (local)

You need Node.js 20+ and a free [Neon](https://neon.tech) database.

```bash
npm install
cp .env.example .env        # then fill in the values (see below)
npm run db:migrate          # creates/updates the tables on Neon (run again after pulling new migrations)
npm run db:seed             # optional: 3 demo companies + 12 demo salaries
npm run dev                 # http://localhost:3000
```

### Environment variables (`.env`)

| Variable | What it is |
| --- | --- |
| `DATABASE_URL` | Neon connection string (Neon dashboard → Connect). |
| `SERVER_SALT` | Long random secret. Generate: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. **Never change it after launch** (it would reset device limits). |
| `ADMIN_PASSWORD` | Password for `/admin`. |
| `GEMINI_API_KEY` | From [Google AI Studio](https://aistudio.google.com/apikey). Used only for payslip reading. |
| `GEMINI_MODEL` | Optional, default `gemini-2.5-flash`. |
| `NEXT_PUBLIC_SITE_URL` | Your public URL, used for SEO and Open Graph links. |

> **Privacy note on Gemini:** on Google's *free* tier, prompts may be used to improve Google products. Because payslips are sensitive, enable billing on the Gemini API project (paid tier) before launch so uploads are not used for training.

## 2. Scripts

| Command | Does |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js dev server / production build / production server |
| `npm test` | Unit tests (normalization, privacy gate, stats, payslip matching, validation) |
| `npm run typecheck` | TypeScript check |
| `npm run db:generate` | Create a new migration after editing `lib/schema.ts` |
| `npm run db:migrate` | Apply migrations in `/drizzle` to the database |
| `npm run db:seed` / `db:unseed` | Add / remove the clearly labelled demo data |

## 3. Deploy to Vercel

1. Push this repo to GitHub and import it in Vercel.
2. Add the env vars above in *Project → Settings → Environment Variables*.
3. Run `npm run db:migrate` once against the production `DATABASE_URL` (from your machine).
4. Seed demo data only in preview databases (`npm run db:seed` with the preview `DATABASE_URL`). Remove it with `npm run db:unseed` once real data arrives.

Vercel limits request bodies to about 4.5 MB. Photos are shrunk in the browser before upload so they stay well under that; a PDF larger than ~4.4 MB will be rejected on Vercel even though the form allows 5 MB.

## 4. How it works

```
app/
  page.tsx                  home: search, top paying titles, recent companies, total count
  search/page.tsx           search results (companies + job titles)
  company/[slug]/page.tsx   company stats, salaries by title, reviews, report button
  jobs/[title]/page.tsx     one title across companies, by experience, top paying companies
  submit/                   step 1 form → step 2 optional payslip → step 3 thanks with group stats
  about/page.tsx            privacy promise, verification, removal, terms
  admin/                    password-protected moderation
  api/verify/route.ts       payslip upload + AI check (memory only)
  api/companies/route.ts    company autocomplete
components/                 SearchBar, SalaryRange, StatsTable, ReviewCard, VerifiedBadge, ReportButton, CompanyInput …
lib/
  db.ts schema.ts           Neon + Drizzle
  stats.ts stats-core.ts    aggregation + MIN_GROUP_SIZE privacy gate
  verify.ts                 extractPayslip (Gemini) + matching logic
  ratelimit.ts              Postgres-based rate limits
  normalize.ts              company slugs, duplicate detection, job title normalization
  i18n.ts                   all UI text (English + Amharic slot)
  privacy.ts validation.ts  contact-info detection, Zod schemas shared by client and server
middleware.ts               sets the anonymous device cookie
drizzle/                    SQL migrations
scripts/                    migrate + seed
```

### Anonymity (spec Section 6)
- No names, emails, phones, IPs or user agents are collected or stored.
- Stats appear only when a group has `MIN_GROUP_SIZE = 5` published salaries (`lib/constants.ts`). Reviews show a salary band only when the company passes that gate.
- Low/high are interpolated 10th/90th percentiles rounded to 100 ETB, so they are never one person's exact salary. Reviews show a band (e.g. 20,000 – 25,000 ETB), an experience range and month/year only.
- Review text with phone numbers, emails or social handles is rejected (client and server).

### Verification (Section 7)
- JPG/PNG/PDF up to 5 MB, checked by MIME type **and** magic bytes. Photos are re-encoded in the browser (smaller, EXIF/GPS stripped).
- The file only exists as an in-memory `Buffer`, goes to Gemini, then all references are dropped. Nothing is written to disk, DB or logs; only fixed, content-free log lines exist.
- Verified when the document appears authentic, the company fuzzy-matches and the gross (or net) monthly amount is within 10%. The browser receives only `{ verified, message }`.
- Only the device that created a submission can verify it; 3 attempts per device per day. Verified salaries count double in ranges.
- To switch AI provider, reimplement `extractPayslip()` in `lib/verify.ts`.

### Anti-abuse (Section 8)
- Device id: random UUID in an httpOnly cookie; only `sha256(id + SERVER_SALT)` is stored.
- Limits: 1 submission per device per company per 12 months, 3 submissions/day, 10 reports/day, 3 verifications/day, 10 admin logins/hour.
- Outliers (> 3× or < ⅓ of the title median when 5+ exist) are saved as `flagged` and hidden until approved.
- 3 reports auto-hide a review. Honeypot field + signed 5-second minimum fill time.
- `/admin`: approve, remove, move a submission to another company (fixes "wrong company"/typos), rename companies. Session is a signed httpOnly cookie that expires after 8 hours.

## 5. Features
- **Search everywhere:** instant results in the hero search and a ⌘K / Ctrl+K / "/" command palette.
- **Company pages:** median and range, distribution chart (10+ salaries), rating breakdown, salaries by role, reviews sortable by *Most helpful* / *Newest*, Telegram share.
- **Job pages:** range, distribution, by experience, by city, highest paying companies.
- **Directories:** `/companies` (filter by name and industry, sort by salaries / rating / A–Z) and `/jobs`.
- **Compare my salary** (`/compare`): percentile vs. people in the same role, with the visitor marked on the distribution. Nothing entered is stored.
- **Net pay calculator** (`/calculator`): 2025 income tax brackets (Proclamation 1395/2025), 7% employee pension, employer 11% shown. Logic in `lib/tax.ts`, unit-tested.
- **Helpful votes:** one per device per review (salted device hash only), stored in `review_votes`.
- **Admin dashboard:** totals, 30-day activity chart, review queue, company rename.

Design: Geist + Geist Mono, ink/white surfaces with hairline borders, purple only for actions and data. Tokens live in `app/globals.css` and switch with `prefers-color-scheme`.

## 6. Before launch
- Have a native speaker fill the Amharic strings in `lib/i18n.ts` (missing keys fall back to English).
- Have a local lawyer review the terms and removal text in `lib/about-content.ts`.
- Test on a throttled "Slow 3G" profile in Chrome DevTools.
