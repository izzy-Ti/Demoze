/** Detects contact details in free text. Such text is rejected, never stored. */

const EMAIL = /[\p{L}\p{N}._%+-]+\s*(@|\(at\)|\[at\])\s*[\p{L}\p{N}.-]+\s*(\.|\(dot\)|\[dot\])\s*\p{L}{2,}/iu;
// Ethiopian mobile/landline formats (+251 9.., 09.., 07.., 011..) and any long digit run.
const ET_PHONE = /(\+?\s*251[\s.-]*|\b0)[1-9]([\s.-]*\d){7,8}\b/;
const LONG_DIGITS = /(\d[\s.-]*){9,}/;
const SOCIAL_HANDLE = /(^|\s)@[a-z0-9_]{4,}/i;

export function containsContactInfo(text: string | null | undefined): boolean {
  if (!text) return false;
  const t = text.normalize("NFKC");
  return EMAIL.test(t) || ET_PHONE.test(t) || LONG_DIGITS.test(t) || SOCIAL_HANDLE.test(t);
}
