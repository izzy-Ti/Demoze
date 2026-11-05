import type { Metadata } from "next";
import { getT } from "@/lib/locale";
import { createFormToken } from "@/lib/crypto";
import { SubmitFlow } from "./SubmitFlow";

export const metadata: Metadata = {
  title: "Add your salary",
  description: "Anonymously share your salary in Ethiopia. No account, no name, no email.",
};

export const dynamic = "force-dynamic";

export default async function SubmitPage({ searchParams }: { searchParams: Promise<{ company?: string }> }) {
  const t = await getT();
  const company = ((await searchParams).company ?? "").toString().slice(0, 120);
  return (
    <SubmitFlow
      formToken={createFormToken()}
      initialCompany={company}
      t={{
        submit: t.submit,
        verify: t.verify,
        errors: t.errors,
        employment: t.employment,
        industries: t.industries,
        home: t.home,
      }}
    />
  );
}
