const numberFmt = new Intl.NumberFormat("en-US");

export function formatEtb(value: number): string {
  return `${numberFmt.format(Math.round(value))} ETB`;
}

export function formatNumber(value: number): string {
  return numberFmt.format(value);
}

/** Only month + year, never an exact date (anonymity rule). */
export function formatMonthYear(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "numeric",
    timeZone: "Africa/Addis_Ababa",
  }).format(date);
}

/** Band width grows with salary so a band never pins down one person. */
function bandStep(salary: number): number {
  if (salary < 10_000) return 2_000;
  if (salary < 50_000) return 5_000;
  if (salary < 100_000) return 10_000;
  if (salary < 300_000) return 25_000;
  return 100_000;
}

/** 22,000 -> [20,000, 25,000] */
export function salaryBand(salary: number): [number, number] {
  const step = bandStep(salary);
  const low = Math.floor(salary / step) * step;
  return [low, low + step];
}

export function formatBand(salary: number): string {
  const [low, high] = salaryBand(salary);
  return `${numberFmt.format(low)} – ${numberFmt.format(high)} ETB`;
}

/** Rounds displayed stats so they do not leak exact individual figures. */
export function roundStat(value: number): number {
  return Math.round(value / 100) * 100;
}
