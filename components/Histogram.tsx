import type { Histogram as H } from "@/lib/stats-core";
import { fmt, type Dictionary } from "@/lib/i18n";
import { formatNumber } from "@/lib/format";
import { HISTOGRAM_MIN } from "@/lib/constants";

function compact(n: number) {
  return n >= 1000 ? `${formatNumber(Math.round(n / 1000))}k` : formatNumber(n);
}

/**
 * Salary distribution as bars (shares, never raw counts) with the median
 * marked, and optionally "You". Pure HTML/CSS, no chart library.
 */
export function Histogram({
  data,
  t,
  you,
  height = 160,
}: {
  data: H;
  t: Dictionary;
  you?: number;
  height?: number;
}) {
  if (!data) {
    return (
      <div className="grid place-items-center rounded-lg border border-dashed border-border-strong bg-bg-subtle text-center text-sm text-fg-muted" style={{ height: Math.min(height, 110) }}>
        <p className="px-6">{fmt(t.common.distributionHidden, { n: HISTOGRAM_MIN })}</p>
      </div>
    );
  }
  const first = data.bins[0]!.from;
  const last = data.bins[data.bins.length - 1]!.to;
  const max = Math.max(...data.bins.map((b) => b.share));
  const pos = (v: number) => Math.min(100, Math.max(0, ((v - first) / (last - first)) * 100));
  const youInRange = you != null;

  return (
    <figure>
      <div className="relative" style={{ height }}>
        <div className="absolute inset-0 flex items-end gap-[3px]" aria-hidden="true">
          {data.bins.map((b, i) => {
            const inYou = you != null && you >= b.from && you < b.to;
            return (
              <div
                key={i}
                className={`bar-in flex-1 rounded-t-[3px] ${inYou ? "bg-accent" : "bg-accent-line"}`}
                style={{ height: `${Math.max(2, (b.share / max) * 100)}%`, "--d": i } as React.CSSProperties}
                title={`${formatNumber(b.from)}–${formatNumber(b.to)} ETB · ${Math.round(b.share * 100)}%`}
              />
            );
          })}
        </div>
        <Marker left={pos(data.median)} label={`${t.common.median} ${compact(data.median)}`} />
        {youInRange && <Marker left={pos(you!)} label={t.compare.yourPay} strong />}
      </div>
      <div className="num mt-2 flex justify-between border-t border-border pt-2 text-xs text-fg-subtle">
        <span>{compact(first)}</span>
        <span>{compact((first + last) / 2)}</span>
        <span>{compact(last)}+</span>
      </div>
      <figcaption className="sr-only">
        {t.common.distribution}: {t.common.median} {formatNumber(data.median)} ETB
      </figcaption>
    </figure>
  );
}

function Marker({ left, label, strong }: { left: number; label: string; strong?: boolean }) {
  const alignRight = left > 70;
  return (
    <div className="pointer-events-none absolute inset-y-0" style={{ left: `${left}%` }}>
      <div className={`absolute inset-y-0 w-px ${strong ? "bg-fg" : "border-l border-dashed border-fg-muted"}`} />
      <span
        className={`absolute -top-1 whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-medium ${
          strong ? "bg-fg text-bg" : "bg-bg text-fg-muted ring-1 ring-border"
        } ${alignRight ? "right-1" : "left-1"}`}
      >
        {label}
      </span>
    </div>
  );
}
