import Link from "next/link";
import type { GroupStats } from "@/lib/stats-core";
import type { Dictionary } from "@/lib/i18n";
import { formatNumber } from "@/lib/format";
import { RangeTrack } from "./SalaryRange";

export type StatsRow = { key: string; label: string; href?: string; sub?: string; stats: GroupStats };

/** Groups on a shared scale: name, range bar, median, count. Rows under the privacy gate show no figures. */
export function StatsTable({ rows, t, firstColumn }: { rows: StatsRow[]; t: Dictionary; firstColumn: string }) {
  const shown = rows.flatMap((r) => (r.stats.enough ? [r.stats] : []));
  const min = Math.min(...shown.map((s) => s.low));
  const max = Math.max(...shown.map((s) => s.high));

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-border text-left text-xs text-fg-muted">
          <th scope="col" className="py-2.5 pr-4 font-medium">{firstColumn}</th>
          <th scope="col" className="hidden w-[38%] py-2.5 pr-6 font-medium sm:table-cell">
            {t.common.low} – {t.common.high}
          </th>
          <th scope="col" className="py-2.5 pr-4 text-right font-medium">{t.common.median}</th>
          <th scope="col" className="hidden py-2.5 text-right font-medium sm:table-cell">{t.common.count}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={row.key} className="group border-b border-border last:border-0">
            <th scope="row" className="py-3.5 pr-4 text-left font-medium">
              {row.href ? (
                <Link href={row.href} className="hover:text-accent-fg">{row.label}</Link>
              ) : (
                row.label
              )}
              {row.sub && <span className="block text-xs font-normal text-fg-muted">{row.sub}</span>}
            </th>
            {row.stats.enough ? (
              <>
                <td className="hidden py-3.5 pr-6 sm:table-cell">
                  <RangeTrack low={row.stats.low} median={row.stats.median} high={row.stats.high} min={min} max={max} d={i} />
                  <div className="num mt-1.5 flex justify-between text-[11px] text-fg-subtle">
                    <span>{formatNumber(row.stats.low)}</span>
                    <span>{formatNumber(row.stats.high)}</span>
                  </div>
                </td>
                <td className="num py-3.5 pr-4 text-right text-base font-semibold">{formatNumber(row.stats.median)}</td>
                <td className="num hidden py-3.5 text-right text-fg-muted sm:table-cell">
                  {row.stats.count}
                  {row.stats.verifiedCount > 0 && <span className="ml-1 text-accent-fg">· {row.stats.verifiedCount}✓</span>}
                </td>
              </>
            ) : (
              <td colSpan={3} className="py-3.5 text-right text-fg-subtle">{t.common.notEnoughData}</td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
