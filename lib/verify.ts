/**
 * Payslip reading + matching.
 *
 * PRIVACY: the file only ever exists as an in-memory Buffer passed to
 * extractPayslip(). It is sent to the AI provider, never written to disk,
 * database, blob storage or logs, and nothing extracted is returned to the browser.
 * Never add console.log calls that print the file, the AI response or the result.
 */
import { z } from "zod";
import { LIMITS } from "./constants";
import { env } from "./env";
import { companiesMatch } from "./normalize";

export type PayslipResult = {
  company: string | null;
  title: string | null;
  monthly_amount: number | null;
  /** Extra field: net pay, so a net-pay submission can still match. */
  net_amount: number | null;
  currency: string | null;
  month: string | null;
  appears_authentic: boolean;
  reason: string;
};

const resultSchema = z.object({
  company: z.string().nullable(),
  title: z.string().nullable(),
  monthly_amount: z.number().nullable(),
  net_amount: z.number().nullable().default(null),
  currency: z.string().nullable(),
  month: z.string().nullable(),
  appears_authentic: z.boolean(),
  reason: z.string(),
});

export const ALLOWED_MIME = ["image/jpeg", "image/png", "application/pdf"] as const;
export type AllowedMime = (typeof ALLOWED_MIME)[number];

/** Checks magic bytes so a renamed file cannot pass as an image/PDF. */
export function sniffMime(buf: Uint8Array): AllowedMime | null {
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (
    buf.length >= 8 &&
    buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47 &&
    buf[4] === 0x0d && buf[5] === 0x0a && buf[6] === 0x1a && buf[7] === 0x0a
  )
    return "image/png";
  if (buf.length >= 5 && buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46 && buf[4] === 0x2d)
    return "application/pdf";
  return null;
}

const PROMPT = `You are checking an employee's salary proof for an anonymous salary website in Ethiopia.
The image or PDF is a payslip, a bank salary-deposit SMS screenshot, an employment letter or a work ID.
Text may be in English or Amharic (Ethiopic script).

Return ONLY JSON with these fields:
- company: the employer's name as printed. If printed in Ethiopic script and you know the common English name, return the English name. null if not shown.
- title: the job title if shown, else null.
- monthly_amount: the GROSS monthly salary as a plain number (no commas). If only one amount is shown, use it. null if no salary amount is shown.
- net_amount: the NET monthly pay as a plain number if shown, else null.
- currency: currency code as shown, e.g. "ETB" (Birr / ብር = ETB). null if unknown.
- month: the pay period as "YYYY-MM" if shown (convert Ethiopian calendar dates to Gregorian if you can), else null.
- appears_authentic: true only if this looks like a genuine, unedited document of the stated type. false if it looks edited, generated, a template, a screenshot of a screenshot with inconsistencies, or unrelated to salary.
- reason: one short sentence explaining appears_authentic. Do NOT include any personal names, account numbers or ID numbers in any field.`;

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    company: { type: "STRING", nullable: true },
    title: { type: "STRING", nullable: true },
    monthly_amount: { type: "NUMBER", nullable: true },
    net_amount: { type: "NUMBER", nullable: true },
    currency: { type: "STRING", nullable: true },
    month: { type: "STRING", nullable: true },
    appears_authentic: { type: "BOOLEAN" },
    reason: { type: "STRING" },
  },
  required: ["company", "title", "monthly_amount", "net_amount", "currency", "month", "appears_authentic", "reason"],
};

export class VerifyProviderError extends Error {}

/**
 * The one swappable AI entry point. Currently implemented with Google Gemini
 * (REST API, key sent in a header, never in the URL).
 */
export async function extractPayslip(file: Buffer, mime: string): Promise<PayslipResult> {
  const model = env.GEMINI_MODEL();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": env.GEMINI_API_KEY(),
      },
      body: JSON.stringify({
        contents: [
          {
            role: "user",
            parts: [{ inlineData: { mimeType: mime, data: file.toString("base64") } }, { text: PROMPT }],
          },
        ],
        generationConfig: {
          temperature: 0,
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
        },
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(45_000),
    });
  } catch {
    throw new VerifyProviderError("network");
  }

  if (!res.ok) throw new VerifyProviderError(`status ${res.status}`);

  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
  };
  const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new VerifyProviderError("bad json");
  }
  const result = resultSchema.safeParse(parsed);
  if (!result.success) throw new VerifyProviderError("bad shape");
  return result.data;
}

export type MatchOutcome = "verified" | "no_match" | "unreadable";

const ETB_ALIASES = ["etb", "birr", "br", "ብር", "ethiopian birr"];

function withinTolerance(amount: number | null, submitted: number): boolean {
  if (amount == null || !Number.isFinite(amount) || amount <= 0) return false;
  return Math.abs(amount - submitted) <= submitted * LIMITS.salaryMatchTolerance;
}

/**
 * Verified only when: appears_authentic, company fuzzy-matches,
 * and gross (or net) amount is within 10% of the submitted monthly salary.
 */
export function matchPayslip(
  result: PayslipResult,
  submission: { companyName: string; monthlySalaryEtb: number },
): MatchOutcome {
  if (!result.company && result.monthly_amount == null && result.net_amount == null) return "unreadable";
  if (!result.appears_authentic) return "no_match";
  if (result.currency && !ETB_ALIASES.includes(result.currency.trim().toLowerCase())) return "no_match";
  if (!result.company || !companiesMatch(result.company, submission.companyName)) return "no_match";
  const salaryOk =
    withinTolerance(result.monthly_amount, submission.monthlySalaryEtb) ||
    withinTolerance(result.net_amount, submission.monthlySalaryEtb);
  return salaryOk ? "verified" : "no_match";
}
