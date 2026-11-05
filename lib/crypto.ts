import "server-only";
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { env } from "./env";

export function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function hmac(purpose: string, value: string): string {
  return createHmac("sha256", env.SERVER_SALT()).update(`${purpose}:${value}`).digest("hex");
}

export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(sha256(a));
  const bb = Buffer.from(sha256(b));
  return timingSafeEqual(ba, bb);
}

/** Signed "issued at" token rendered into the form, used for the minimum fill time. */
export function createFormToken(now = Date.now()): string {
  const ts = String(now);
  return `${ts}.${hmac("form", ts)}`;
}

export type FormTokenCheck = "ok" | "too_fast" | "invalid";

export function checkFormToken(
  token: string | null | undefined,
  minSeconds: number,
  now = Date.now(),
): FormTokenCheck {
  if (!token) return "invalid";
  const [ts, sig] = token.split(".");
  if (!ts || !sig || !/^\d+$/.test(ts) || !safeEqual(sig, hmac("form", ts))) return "invalid";
  const age = now - Number(ts);
  if (age < minSeconds * 1000) return "too_fast";
  if (age > 6 * 60 * 60 * 1000) return "invalid"; // expires after 6 hours
  return "ok";
}
