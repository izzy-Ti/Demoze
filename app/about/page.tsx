import type { Metadata } from "next";
import Link from "next/link";
import { MIN_GROUP_SIZE } from "@/lib/constants";
import { getT } from "@/lib/locale";
import { aboutContent } from "@/lib/about-content";
import { PageHeader } from "@/components/PageHeader";

export const metadata: Metadata = {
  title: "Privacy, verification & terms",
  description: "What Demoze stores, what it never stores, how payslip verification works, and how to request removal.",
};

export default async function AboutPage() {
  const t = await getT();
  const sections = aboutContent(MIN_GROUP_SIZE);

  return (
    <div>
      <PageHeader title={t.about.title} subtitle={t.about.subtitle} />
      <div className="grid gap-12 lg:grid-cols-[13rem_1fr]">
        <nav aria-label={t.about.title} className="hidden lg:block">
          <ul className="sticky top-24 space-y-1 border-l border-border text-sm">
            {sections.map((s) => (
              <li key={s.id}>
                <a href={`#${s.id}`} className="-ml-px block border-l border-transparent py-1 pl-4 text-fg-muted hover:border-fg hover:text-fg">
                  {s.heading}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <article className="max-w-2xl space-y-12">
          {sections.map((s) => (
            <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`} className="scroll-mt-24">
              <h2 id={`${s.id}-h`} className="section-title">{s.heading}</h2>
              {s.intro && <p className="mt-3 text-lg leading-relaxed text-fg-muted">{s.intro}</p>}
              {s.items && (
                <ul className="mt-4 space-y-3 leading-relaxed">
                  {s.items.map((item) => (
                    <li key={item} className="flex gap-3">
                      <span aria-hidden="true" className={`mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full ${s.id === "not-stored" ? "bg-bad" : "bg-accent"}`} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
          <Link href="/submit" className="btn-primary">{t.nav.share}</Link>
        </article>
      </div>
    </div>
  );
}
