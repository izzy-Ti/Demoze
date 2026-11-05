import "server-only";
import { cookies } from "next/headers";
import { randomUUID } from "node:crypto";
import { sha256 } from "./crypto";
import { env } from "./env";

/**
 * Anonymous device id. The browser holds a random id in an httpOnly cookie;
 * the database only ever sees sha256(id + SERVER_SALT). Used for rate limits only.
 */
export const DEVICE_COOKIE = "dz_device";
export const DEVICE_COOKIE_MAX_AGE = 60 * 60 * 24 * 400;

const UUID_RE = /^[0-9a-f-]{36}$/i;

export function hashDeviceId(id: string): string {
  return sha256(id + env.SERVER_SALT());
}

/** Read-only: returns null if the visitor has no device cookie yet. */
export async function readDeviceHash(): Promise<string | null> {
  const id = (await cookies()).get(DEVICE_COOKIE)?.value;
  return id && UUID_RE.test(id) ? hashDeviceId(id) : null;
}

/** For Server Actions: creates the cookie if it is missing (middleware normally does this). */
export async function ensureDeviceHash(): Promise<string> {
  const store = await cookies();
  let id = store.get(DEVICE_COOKIE)?.value;
  if (!id || !UUID_RE.test(id)) {
    id = randomUUID();
    store.set(DEVICE_COOKIE, id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: DEVICE_COOKIE_MAX_AGE,
    });
  }
  return hashDeviceId(id);
}
