/** Company + job title normalization. Pure functions, safe on client and server. */

const COMPANY_SUFFIXES = [
  "share company",
  "private limited company",
  "limited",
  "ltd",
  "plc",
  "p l c",
  "s c",
  "sc",
  "inc",
  "llc",
  "corp",
  "corporation",
  "co",
  "enterprise",
];

function basicClean(input: string): string {
  return input
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[’'`]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .replace(/\s+/g, " ");
}

/** Removes legal suffixes like "PLC" or "S.C." so "Dashen Bank S.C." == "Dashen Bank". */
export function stripCompanySuffixes(name: string): string {
  let cleaned = basicClean(name);
  let changed = true;
  while (changed) {
    changed = false;
    for (const suffix of COMPANY_SUFFIXES) {
      if (cleaned.endsWith(" " + suffix)) {
        cleaned = cleaned.slice(0, -suffix.length - 1).trim();
        changed = true;
      }
    }
  }
  return cleaned;
}

/** "Ethio Telecom S.C." -> "ethio-telecom" */
export function companySlug(name: string): string {
  return stripCompanySuffixes(name).replace(/\s+/g, "-").slice(0, 80) || "company";
}

/** Spacing-insensitive key: "Ethio Telecom" and "Ethiotelecom" both -> "ethiotelecom". */
export function companyKey(name: string): string {
  return companySlug(name).replace(/-/g, "");
}

/** Trims and collapses whitespace in a display name. */
export function cleanDisplayName(name: string): string {
  return name.normalize("NFKC").trim().replace(/\s+/g, " ");
}

const TITLE_WORDS: Record<string, string> = {
  sr: "senior",
  snr: "senior",
  jr: "junior",
  jnr: "junior",
  dev: "developer",
  devs: "developer",
  eng: "engineer",
  engr: "engineer",
  mgr: "manager",
  mngr: "manager",
  asst: "assistant",
  admin: "administrator",
  exec: "executive",
  rep: "representative",
  acct: "accountant",
  hr: "hr",
  it: "it",
  qa: "qa",
  ui: "ui",
  ux: "ux",
};

/** "Sr. Software Dev" -> "senior software developer" */
export function normalizeTitle(title: string): string {
  return basicClean(title)
    .split(" ")
    .filter(Boolean)
    .map((w) => TITLE_WORDS[w] ?? w)
    .join(" ")
    .slice(0, 100);
}

/** URL segment for a normalized title: "software developer" -> "software-developer" */
export function titleToSlug(normalized: string): string {
  return normalized.replace(/\s+/g, "-");
}

export function slugToTitle(slug: string): string {
  return normalizeTitle(decodeURIComponent(slug).replace(/-/g, " "));
}

/** Display a normalized title nicely: "software developer" -> "Software Developer" */
export function displayTitle(normalized: string): string {
  return normalized.replace(/(^|\s)(\p{L})/gu, (_, sp: string, ch: string) => sp + ch.toUpperCase())
    .replace(/\b(Hr|It|Qa|Ui|Ux|Ceo|Cto|Cfo)\b/g, (m) => m.toUpperCase());
}

/** Bigram Dice similarity in [0,1]. */
function dice(a: string, b: string): number {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const grams = new Map<string, number>();
  for (let i = 0; i < a.length - 1; i++) {
    const g = a.slice(i, i + 2);
    grams.set(g, (grams.get(g) ?? 0) + 1);
  }
  let hits = 0;
  for (let i = 0; i < b.length - 1; i++) {
    const g = b.slice(i, i + 2);
    const n = grams.get(g) ?? 0;
    if (n > 0) {
      grams.set(g, n - 1);
      hits++;
    }
  }
  return (2 * hits) / (a.length - 1 + b.length - 1);
}

/** Fuzzy company comparison used for payslip verification. */
export function companiesMatch(a: string, b: string): boolean {
  const ka = companyKey(a);
  const kb = companyKey(b);
  if (!ka || !kb) return false;
  if (ka === kb) return true;
  const shorter = ka.length <= kb.length ? ka : kb;
  const longer = ka.length <= kb.length ? kb : ka;
  if (shorter.length >= 4 && longer.includes(shorter)) return true;
  return dice(ka, kb) >= 0.8;
}
