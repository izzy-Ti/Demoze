"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { BRACKETS_2025, netPay } from "@/lib/tax";
import { formatNumber } from "@/lib/format";
import { fmt, type Dictionary } from "@/lib/i18n";

const parse = (s: string) => {
  const n = Number(s.replace(/[,\s]/g, ""));
  return Number.isFinite(n) && n >= 0 ? Math.min(n, 10_000_000) : 0;
};
const money = (n: number) => formatNumber(Math.round(n));
const pct = (n: number) => `${(n * 100).toFixed(n > 0 && n < 0.1 ? 1 : 0)}%`;

export function NetPayCalculator({ t, etb, initialGross }: { t: Dictionary["calculator"]; etb: string; initialGross: number }) {
  const id = useId();
  const [grossText, setGrossText] = useState(formatNumber(initialGross));
  const [basicText, setBasicText] = useState("");
  const [withPension, setWithPension] = useState(true);

  const gross = parse(grossText);
  const basic = basicText.trim() === "" ? gross : parse(basicText);
  const r = useMemo(() => netPay(gross, basic, withPension), [gross, basic, withPension]);
  const bracketIndex = BRACKETS_2025.findIndex((b) => b.upTo === null || gross <= b.upTo);
  const share = (n: number) => (gross > 0 ? (n / gross) * 100 : 0);

  return (
    <div className="grid gap-8 lg:grid-cols-[22rem_1fr]">
      <div className="card card-pad h-fit space-y-5">
        <div>
          <label htmlFor={`${id}-g`} className="label">{t.grossLabel}</label>
          <div className="relative">
            <input
              id={`${id}-g`}
              inputMode="numeric"
              value={grossText}
              onChange={(e) => setGrossText(e.target.value)}
              onBlur={() => setGrossText(gross ? formatNumber(gross) : "")}
              className="input num h-14 pr-14 text-2xl font-semibold"
              autoComplete="off"
            />
            <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-fg-subtle">{etb}</span>
          </div>
          <input
            type="range"
            min={0}
            max={200_000}
            step={500}
            value={Math.min(gross, 200_000)}
            onChange={(e) => setGrossText(formatNumber(Number(e.target.value)))}
            aria-label={t.grossLabel}
            className="mt-4 w-full accent-[var(--accent)]"
          />
        </div>
        <label className="flex cursor-pointer items-center gap-2.5 text-sm">
          <input type="checkbox" checked={withPension} onChange={(e) => setWithPension(e.target.checked)} className="h-4 w-4 accent-[var(--accent)]" />
          {t.pensionLabel}
        </label>
        {withPension && (
          <div>
            <label htmlFor={`${id}-b`} className="label">{t.basicLabel}</label>
            <input
              id={`${id}-b`}
              inputMode="numeric"
              value={basicText}
              placeholder={gross ? formatNumber(gross) : ""}
              onChange={(e) => setBasicText(e.target.value)}
              className="input num"
              autoComplete="off"
            />
            <p className="hint">{t.basicHint}</p>
          </div>
        )}
      </div>

      <div className="space-y-6" aria-live="polite">
        <section className="card card-pad">
          <p className="kicker">{t.net}</p>
          <p className="mt-1 flex items-baseline gap-2">
            <span className="num text-6xl font-semibold tracking-tight">{money(r.net)}</span>
            <span className="text-fg-muted">{etb}</span>
          </p>
          <p className="mt-1 text-sm text-fg-muted">{t.yearly}: <span className="num">{money(r.net * 12)}</span> {etb}</p>

          <div className="mt-7 flex h-3 overflow-hidden rounded-full bg-bg-muted" aria-hidden="true">
            <span className="h-full bg-accent transition-[width] duration-300" style={{ width: `${share(r.net)}%` }} />
            <span className="h-full bg-bad/70 transition-[width] duration-300" style={{ width: `${share(r.tax)}%` }} />
            <span className="h-full bg-fg-subtle transition-[width] duration-300" style={{ width: `${share(r.pension)}%` }} />
          </div>

          <dl className="mt-6 divide-y divide-border border-t border-border text-sm">
            <Row label={t.gross} value={`${money(r.gross)} ${etb}`} />
            <Row label={t.tax} value={`− ${money(r.tax)} ${etb}`} dot="bg-bad/70" />
            {withPension && <Row label={t.pension} value={`− ${money(r.pension)} ${etb}`} dot="bg-fg-subtle" />}
            <Row label={t.net} value={`${money(r.net)} ${etb}`} dot="bg-accent" strong />
            <Row label={t.effective} value={pct(r.effectiveRate)} />
            <Row label={t.marginal} value={pct(r.marginalRate)} />
          </dl>
          {withPension && r.employerPension > 0 && (
            <p className="mt-4 text-sm text-fg-muted">{fmt(t.employer, { n: money(r.employerPension) })}</p>
          )}
        </section>

        <section className="card card-pad">
          <h2 className="section-title">{t.brackets}</h2>
          <table className="mt-4 w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-fg-muted">
                <th scope="col" className="py-2 font-medium">{t.income}</th>
                <th scope="col" className="py-2 text-right font-medium">{t.rate}</th>
                <th scope="col" className="py-2 text-right font-medium">{t.deduction}</th>
              </tr>
            </thead>
            <tbody className="num">
              {BRACKETS_2025.map((b, i) => {
                const from = i === 0 ? 0 : BRACKETS_2025[i - 1]!.upTo! + 1;
                const active = i === bracketIndex && gross > 0;
                return (
                  <tr key={i} className={`border-b border-border last:border-0 ${active ? "bg-accent-soft font-semibold text-accent-fg" : ""}`}>
                    <td className="px-2 py-2.5">
                      {formatNumber(from)} – {b.upTo ? formatNumber(b.upTo) : <span className="font-sans">{t.andAbove}</span>}
                    </td>
                    <td className="px-2 py-2.5 text-right">{Math.round(b.rate * 100)}%</td>
                    <td className="px-2 py-2.5 text-right">{formatNumber(b.deduction)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <p className="mt-4 text-xs text-fg-subtle">{t.disclaimer}</p>
        </section>

        <Link href={`/compare?salary=${Math.round(gross)}`} className="link inline-block text-sm">{t.compareCta} →</Link>
      </div>
    </div>
  );
}

function Row({ label, value, dot, strong }: { label: string; value: string; dot?: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <dt className="flex items-center gap-2 text-fg-muted">
        {dot && <span aria-hidden="true" className={`h-2 w-2 rounded-full ${dot}`} />}
        {label}
      </dt>
      <dd className={`num ${strong ? "text-base font-semibold" : ""}`}>{value}</dd>
    </div>
  );
}
