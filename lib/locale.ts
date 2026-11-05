import "server-only";
import { cookies } from "next/headers";
import { getDictionary, isLocale, type Locale } from "./i18n";

export const LOCALE_COOKIE = "dz_lang";

export async function getLocale(): Promise<Locale> {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : "en";
}

export async function getT() {
  return getDictionary(await getLocale());
}
