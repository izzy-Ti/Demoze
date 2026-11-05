/**
 * Ethiopian employment income tax (monthly), Income Tax (Amendment)
 * Proclamation No. 1395/2025, effective July 2025. Pure functions, unit-tested.
 *
 * Employee pension contribution: 7% of basic salary (Proclamation 1268/2022, private sector).
 * Pension is NOT deducted before computing income tax.
 */

export type Bracket = { upTo: number | null; rate: number; deduction: number };

/** Rate applied to the whole monthly income, minus the deduction constant. */
export const BRACKETS_2025: Bracket[] = [
  { upTo: 2_000, rate: 0, deduction: 0 },
  { upTo: 4_000, rate: 0.15, deduction: 300 },
  { upTo: 7_000, rate: 0.2, deduction: 500 },
  { upTo: 10_000, rate: 0.25, deduction: 850 },
  { upTo: 14_000, rate: 0.3, deduction: 1_350 },
  { upTo: null, rate: 0.35, deduction: 2_050 },
];

export const EMPLOYEE_PENSION_RATE = 0.07;
export const EMPLOYER_PENSION_RATE = 0.11;

export function bracketFor(gross: number): Bracket {
  return BRACKETS_2025.find((b) => b.upTo === null || gross <= b.upTo)!;
}

export function incomeTax(gross: number): number {
  if (!Number.isFinite(gross) || gross <= 0) return 0;
  const b = bracketFor(gross);
  return Math.max(0, round2(gross * b.rate - b.deduction));
}

export type NetPay = {
  gross: number;
  tax: number;
  pension: number;
  net: number;
  marginalRate: number;
  effectiveRate: number;
  employerPension: number;
};

/**
 * @param gross monthly gross taxable income (salary + taxable allowances)
 * @param basic monthly basic salary used for pension (defaults to gross)
 */
export function netPay(gross: number, basic = gross, withPension = true): NetPay {
  const g = Math.max(0, gross || 0);
  const tax = incomeTax(g);
  const pension = withPension ? round2(Math.max(0, Math.min(basic, g)) * EMPLOYEE_PENSION_RATE) : 0;
  const net = round2(g - tax - pension);
  return {
    gross: g,
    tax,
    pension,
    net,
    marginalRate: bracketFor(g).rate,
    effectiveRate: g > 0 ? tax / g : 0,
    employerPension: withPension ? round2(Math.max(0, Math.min(basic, g)) * EMPLOYER_PENSION_RATE) : 0,
  };
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}
