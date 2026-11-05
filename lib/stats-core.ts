/** Pure statistics + privacy gating. No database access, unit-tested. */
import { EXPERIENCE_BUCKETS, HISTOGRAM_MIN, LIMITS, MIN_GROUP_SIZE, VERIFIED_WEIGHT } from "./constants";
import { roundStat } from "./format";

export type SalaryPoint = { salary: number; verified: boolean };

export type GroupStats =
  | { enough: false; count: number }
  | {
      enough: true;
      count: number;
      verifiedCount: number;
      low: number;
      median: number;
      high: number;
    };

/**
 * Linear-interpolated quantile where verified points count VERIFIED_WEIGHT times.
 * Interpolation means low/high are never one person's exact salary.
 */
export function weightedQuantile(points: SalaryPoint[], q: number): number {
  const expanded: number[] = [];
  for (const p of points) {
    const w = p.verified ? VERIFIED_WEIGHT : 1;
    for (let i = 0; i < w; i++) expanded.push(p.salary);
  }
  if (expanded.length === 0) return 0;
  expanded.sort((a, b) => a - b);
  const pos = (expanded.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  const a = expanded[lo]!;
  const b = expanded[hi]!;
  return a + (b - a) * (pos - lo);
}

/** Applies the MIN_GROUP_SIZE privacy gate. Below it, only the count is returned. */
export function summarize(points: SalaryPoint[]): GroupStats {
  const count = points.length;
  if (count < MIN_GROUP_SIZE) return { enough: false, count };
  return {
    enough: true,
    count,
    verifiedCount: points.filter((p) => p.verified).length,
    low: roundStat(weightedQuantile(points, 0.1)),
    median: roundStat(weightedQuantile(points, 0.5)),
    high: roundStat(weightedQuantile(points, 0.9)),
  };
}

export function experienceBucket(years: number): string {
  return (EXPERIENCE_BUCKETS.find((b) => years >= b.min && years <= b.max) ?? EXPERIENCE_BUCKETS[3])
    .key;
}

/** Plain (unweighted) median, used for outlier detection. */
export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

/** More than 3x or less than 1/3 of the title median (only when 5+ exist). */
export function isOutlier(salary: number, peerSalaries: number[]): boolean {
  if (peerSalaries.length < MIN_GROUP_SIZE) return false;
  const m = median(peerSalaries);
  if (!m) return false;
  return salary > m * LIMITS.outlierFactor || salary < m / LIMITS.outlierFactor;
}

export type Histogram = { bins: { from: number; to: number; share: number }[]; median: number } | null;

/**
 * Distribution for charts. Only for groups of HISTOGRAM_MIN+; the range is
 * clipped to the 5th–95th percentile so extreme individuals never get their own bar.
 * Returns shares (0–1), never raw counts.
 */
export function histogram(points: SalaryPoint[], binCount = 14): Histogram {
  if (points.length < HISTOGRAM_MIN) return null;
  const lo = weightedQuantile(points, 0.05);
  const hi = weightedQuantile(points, 0.95);
  if (!(hi > lo)) return null;
  const step = niceStep((hi - lo) / binCount);
  const start = Math.floor(lo / step) * step;
  const n = Math.max(1, Math.ceil((hi - start) / step));
  const counts = new Array<number>(n).fill(0);
  for (const p of points) {
    const idx = Math.min(n - 1, Math.max(0, Math.floor((p.salary - start) / step)));
    counts[idx]! += 1;
  }
  return {
    bins: counts.map((c, i) => ({ from: start + i * step, to: start + (i + 1) * step, share: c / points.length })),
    median: roundStat(weightedQuantile(points, 0.5)),
  };
}

function niceStep(raw: number): number {
  const pow = 10 ** Math.floor(Math.log10(Math.max(raw, 1)));
  const m = raw / pow;
  return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10) * pow;
}

/** Share of the group earning less than `value` (ties count half). 0–100. */
export function percentileRank(value: number, salaries: number[]): number {
  if (salaries.length === 0) return 0;
  let below = 0;
  let equal = 0;
  for (const s of salaries) {
    if (s < value) below++;
    else if (s === value) equal++;
  }
  return Math.round(((below + equal / 2) / salaries.length) * 100);
}

export function groupBy<T, K extends string>(items: T[], key: (t: T) => K): Map<K, T[]> {
  const map = new Map<K, T[]>();
  for (const item of items) {
    const k = key(item);
    const list = map.get(k);
    if (list) list.push(item);
    else map.set(k, [item]);
  }
  return map;
}
