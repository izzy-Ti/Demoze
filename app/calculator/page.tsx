import type { Metadata } from "next";
import { getT } from "@/lib/locale";
import { PageHeader } from "@/components/PageHeader";
import { NetPayCalculator } from "./NetPayCalculator";

export const metadata: Metadata = {
  title: "Net pay calculator (2025)",
  description:
    "Calculate your monthly take-home pay in Ethiopia with the 2025 income tax brackets (Proclamation 1395/2025) and 7% pension.",
};

export default async function CalculatorPage({ searchParams }: { searchParams: Promise<{ gross?: string }> }) {
  const t = await getT();
  const g = Number((await searchParams).gross);
  const initial = Number.isFinite(g) && g > 0 && g <= 2_000_000 ? Math.round(g) : 25_000;
  return (
    <div>
      <PageHeader title={t.calculator.title} subtitle={t.calculator.subtitle} />
      <NetPayCalculator t={t.calculator} etb={t.common.etb} initialGross={initial} />
    </div>
  );
}
