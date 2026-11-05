import "server-only";
import { cookies } from "next/headers";
import { hmac, safeEqual, sha256 } from "./crypto";
import { env } from "./env";

export const ADMIN_COOKIE = "dz_admin";
const SESSION_SECONDS = 60 * 60 * 8;

/** Stateless signed session. Changing ADMIN_PASSWORD or SERVER_SALT logs everyone out. */
function sign(exp: string): string {
  return hmac("admin", `${exp}:${sha256(env.ADMIN_PASSWORD())}`);
}

export function checkPassword(input: string): boolean {
  return safeEqual(input, env.ADMIN_PASSWORD());
}

export async function startAdminSession() {
  const exp = String(Date.now() + SESSION_SECONDS * 1000);
  (await cookies()).set(ADMIN_COOKIE, `${exp}.${sign(exp)}`, {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_SECONDS,
  });
}

export async function endAdminSession() {
  (await cookies()).delete(ADMIN_COOKIE);
}

export async function isAdmin(): Promise<boolean> {
  const value = (await cookies()).get(ADMIN_COOKIE)?.value;
  if (!value) return false;
  const [exp, sig] = value.split(".");
  if (!exp || !sig || !/^\d+$/.test(exp) || Number(exp) < Date.now()) return false;
  return safeEqual(sig, sign(exp));
}

/** Call at the top of every admin Server Action. */
export async function requireAdmin() {
  if (!(await isAdmin())) throw new Error("Unauthorized");
}
