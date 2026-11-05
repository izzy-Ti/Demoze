/**
 * Payslip verification.
 *
 * PRIVACY RULES FOR THIS FILE (Section 7 of the spec):
 * - The upload is read into memory only. Never write it to disk, DB, blob storage or logs.
 * - Never log the request body, the file, the AI response or the extracted fields.
 *   Only fixed, content-free messages may be logged.
 * - The response is only { verified, message }. Extracted text never reaches the browser.
 */
import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { companies, submissions } from "@/lib/schema";
import { readDeviceHash } from "@/lib/device";
import { consume, DAY } from "@/lib/ratelimit";
import { LIMITS } from "@/lib/constants";
import { extractPayslip, matchPayslip, sniffMime, ALLOWED_MIME, type AllowedMime } from "@/lib/verify";
import { uuidSchema } from "@/lib/validation";
import { getT } from "@/lib/locale";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const NO_STORE = { "cache-control": "no-store" };

function reply(verified: boolean, message: string, status = 200) {
  return NextResponse.json({ verified, message }, { status, headers: NO_STORE });
}

export async function POST(request: NextRequest) {
  const t = (await getT()).verify;

  const deviceHash = await readDeviceHash();
  if (!deviceHash) return reply(false, t.notAllowed, 403);

  // Reject oversized bodies before reading them.
  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > LIMITS.maxUploadBytes + 64 * 1024) return reply(false, t.tooBig, 413);

  let form: FormData;
  try {
    form = await request.formData(); // parsed in memory, nothing touches disk
  } catch {
    return reply(false, t.badType, 400);
  }

  const idParse = uuidSchema.safeParse(form.get("submissionId"));
  const upload = form.get("file");
  if (!idParse.success || !(upload instanceof File)) return reply(false, t.badType, 400);
  if (upload.size === 0 || upload.size > LIMITS.maxUploadBytes) return reply(false, t.tooBig, 413);
  if (!(ALLOWED_MIME as readonly string[]).includes(upload.type)) return reply(false, t.badType, 415);

  const [submission] = await db
    .select({
      id: submissions.id,
      deviceHash: submissions.deviceHash,
      verified: submissions.verified,
      status: submissions.status,
      salary: submissions.monthlySalaryEtb,
      companyName: companies.name,
    })
    .from(submissions)
    .innerJoin(companies, eq(companies.id, submissions.companyId))
    .where(eq(submissions.id, idParse.data))
    .limit(1);

  // Only the device that created a submission may verify it.
  if (!submission || submission.deviceHash !== deviceHash || submission.status === "removed") {
    return reply(false, t.notAllowed, 403);
  }
  if (submission.verified) return reply(true, t.already);

  const limit = await consume(`verify:${deviceHash}`, LIMITS.verificationsPerDay, DAY);
  if (!limit.allowed) return reply(false, t.limit, 429);

  let file: Buffer | null = Buffer.from(await upload.arrayBuffer());
  let outcome: ReturnType<typeof matchPayslip> | "error";
  try {
    const mime = sniffMime(file);
    if (!mime || mime !== (upload.type as AllowedMime)) {
      file = null;
      return reply(false, t.badType, 415);
    }
    const extracted = await extractPayslip(file, mime);
    outcome = matchPayslip(extracted, {
      companyName: submission.companyName,
      monthlySalaryEtb: submission.salary,
    });
  } catch {
    console.error("verify: provider call failed"); // content-free on purpose
    outcome = "error";
  } finally {
    // Drop every reference to the uploaded bytes.
    file = null;
  }

  if (outcome === "verified") {
    await db.update(submissions).set({ verified: true }).where(eq(submissions.id, submission.id));
    return reply(true, t.success);
  }
  if (outcome === "unreadable") return reply(false, t.unreadable);
  if (outcome === "error") return reply(false, t.unavailable, 502);
  return reply(false, t.noMatch);
}
