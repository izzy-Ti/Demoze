import { test } from "node:test";
import assert from "node:assert/strict";
import { incomeTax, netPay, BRACKETS_2025 } from "./tax";
import { histogram, percentileRank } from "./stats-core";

/** Reference: marginal computation band by band, to check the deduction-constant shortcut. */
function marginalTax(gross: number) {
  const bands = [
    [2000, 0],
    [4000, 0.15],
    [7000, 0.2],
    [10000, 0.25],
    [14000, 0.3],
    [Infinity, 0.35],
  ] as const;
  let tax = 0;
  let prev = 0;
  for (const [cap, rate] of bands) {
    if (gross > prev) tax += (Math.min(gross, cap) - prev) * rate;
    prev = cap;
  }
  return Math.round(tax * 100) / 100;
}

test("2025 brackets: deduction method equals band-by-band method", () => {
  for (const g of [0, 1500, 2000, 2001, 3000, 4000, 5500, 7000, 9999, 10000, 12000, 14000, 14001, 25000, 100000]) {
    assert.equal(incomeTax(g), marginalTax(g), `gross ${g}`);
  }
});

test("known values", () => {
  assert.equal(incomeTax(2000), 0);
  assert.equal(incomeTax(4000), 300);
  assert.equal(incomeTax(10000), 1650);
  assert.equal(incomeTax(30000), 8450);
  const r = netPay(30000);
  assert.equal(r.pension, 2100);
  assert.equal(r.net, 19450);
  assert.equal(r.marginalRate, 0.35);
  assert.equal(r.employerPension, 3300);
});

test("pension uses basic salary and can be switched off", () => {
  assert.equal(netPay(20000, 10000).pension, 700);
  assert.equal(netPay(20000, 20000, false).pension, 0);
  assert.equal(BRACKETS_2025.at(-1)!.upTo, null);
});

test("percentile rank", () => {
  const s = [10, 20, 30, 40, 50];
  assert.equal(percentileRank(5, s), 0);
  assert.equal(percentileRank(30, s), 50);
  assert.equal(percentileRank(100, s), 100);
});

test("histogram is gated and returns shares only", () => {
  const few = Array.from({ length: 9 }, (_, i) => ({ salary: 10000 + i * 1000, verified: false }));
  assert.equal(histogram(few), null);
  const many = Array.from({ length: 40 }, (_, i) => ({ salary: 10000 + i * 1000, verified: i % 3 === 0 }));
  const h = histogram(many)!;
  assert.ok(h.bins.length > 3);
  const total = h.bins.reduce((a, b) => a + b.share, 0);
  assert.ok(Math.abs(total - 1) < 1e-9);
  assert.ok(h.bins.every((b) => b.share <= 1 && !("count" in b)));
});
