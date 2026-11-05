import Link from "next/link";
import type { GroupStats } from "@/lib/stats-core";
import { fmt, type Dictionary } from "@/lib/i18n";
import { formatNumber } from "@/lib/format";
import { MIN_GROUP_SIZE } from "@/lib/constants";

/** Headline median + low/high range for one group. Renders the privacy gate below MIN_GROUP_SIZE. */
export function SalaryRange({ stats, t, size = "lg" }: { stats: GroupStats; t: Dictionary; size?: "lg" | "md" }) {
  if (!stats.enough) return <NotEnoughData t={t} count={stats.count} />;
  return (
    <div>
      <p className="kicker">{t.common.median}</p>
      <p className="mt-1 flex items-baseline gap-2">
        <span className={`num font-semibold tracking-tight ${size === "lg" ? "text-5xl sm:text-6xl" : "text-4xl"}`}>
          {formatNumber(stats.median)}
        </span>
        <span className="text-sm text-fg-muted">{t.common.etb} {t.common.monthly}</span>
      </p>
      <div className="mt-6">
        <RangeTrack low={stats.low} median={stats.median} high={stats.high} min={stats.low} max={stats.high} />
        <div className="mt-2 flex justify-between text-sm">
          <span><span className="text-fg-muted">{t.common.low}</span> <span className="num font-medium">{formatNumber(stats.low)}</span></span>
          <span><span className="text-fg-muted">{t.common.high}</span> <span className="num font-medium">{formatNumber(stats.high)}</span></span>
        </div>
      </div>
      <p className="mt-5 flex flex-wrap gap-x-4 gap-y-1 border-t border-border pt-4 text-sm text-fg-muted">
        <span><span className="num font-medium text-fg">{formatNumber(stats.count)}</span> {t.common.salaries}</span>
        <span><span className="num font-medium text-accent-fg">{formatNumber(stats.verifiedCount)}</span> {t.common.verified.toLowerCase()}</span>
      </p>
    </div>
  );
}

/** A thin track with the low–high segment and a median tick, on a given scale. */
export function RangeTrack({
  low,
  median,
  high,
  min,
  max,
  d = 0,
}: {
  low: number;
  median: number;
  high: number;
  min: number;
  max: number;
  d?: number;
}) {
  const pct = (v: number) => (max > min ? ((v - min) / (max - min)) * 100 : 50);
  const left = pct(low);
  const right = 100 - pct(high);
  return (
    <div className="relative h-2 rounded-full bg-bg-muted" aria-hidden="true">
      <div
        className="grow-in absolute inset-y-0 rounded-full bg-accent-line"
        style={{ left: `${left}%`, right: `${right}%`, "--d": d } as React.CSSProperties}
      />
      <div
        className="absolute top-1/2 h-4 w-[3px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent"
        style={{ left: `${pct(median)}%` }}
      />
    </div>
  );
}

/** Privacy gate: progress toward MIN_GROUP_SIZE, never a salary figure. */
export function NotEnoughData({ t, count, inline }: { t: Dictionary; count?: number; inline?: boolean }) {
  if (inline) return <span className="text-sm text-fg-subtle">{t.common.notEnoughData}</span>;
  const filled = Math.min(count ?? 0, MIN_GROUP_SIZE);
  return (
    <div className="rounded-xl border border-dashed border-border-strong bg-bg-subtle px-5 py-8 text-center">
      <p className="font-medium">{t.common.notEnoughData}</p>
      <p className="mx-auto mt-1 max-w-xs text-sm text-fg-muted">{fmt(t.common.notEnoughDataHint, { n: MIN_GROUP_SIZE })}</p>
      {count != null && (
        <div className="mt-4 flex items-center justify-center gap-1" role="img" aria-label={`${filled} / ${MIN_GROUP_SIZE}`}>
          {Array.from({ length: MIN_GROUP_SIZE }, (_, n) => (
            <span key={n} className={`h-1.5 w-6 rounded-full ${n < filled ? "bg-accent" : "bg-border-strong"}`} />
          ))}
          <span className="num ml-2 text-xs text-fg-muted">{filled}/{MIN_GROUP_SIZE}</span>
        </div>
      )}
      <Link href="/submit" className="btn-secondary btn-sm mt-5">{t.common.addYours}</Link>
    </div>
  );
}
