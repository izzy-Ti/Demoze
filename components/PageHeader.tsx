import Link from "next/link";

export type Crumb = { href?: string; label: string };

/** Page opening: breadcrumb, title, meta line, actions. */
export function PageHeader({
  crumbs,
  title,
  subtitle,
  meta,
  actions,
}: {
  crumbs?: Crumb[];
  title: string;
  subtitle?: string;
  meta?: React.ReactNode;
  actions?: React.ReactNode;
}) {
  return (
    <header className="enter mb-10 flex flex-col gap-5 border-b border-border pb-8 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        {crumbs && crumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="mb-3">
            <ol className="flex flex-wrap items-center gap-1.5 text-sm text-fg-muted">
              {crumbs.map((c, i) => (
                <li key={i} className="flex items-center gap-1.5">
                  {i > 0 && <span aria-hidden="true" className="text-fg-subtle">/</span>}
                  {c.href ? <Link href={c.href} className="hover:text-fg">{c.label}</Link> : <span aria-current="page">{c.label}</span>}
                </li>
              ))}
            </ol>
          </nav>
        )}
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        {subtitle && <p className="mt-2 max-w-2xl text-fg-muted">{subtitle}</p>}
        {meta && <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-fg-muted">{meta}</div>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function SectionTitle({ id, title, aside }: { id: string; title: string; aside?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <h2 id={id} className="section-title">{title}</h2>
      {aside}
    </div>
  );
}

export function Pagination({
  page,
  hasMore,
  makeHref,
  labels,
}: {
  page: number;
  hasMore: boolean;
  makeHref: (page: number) => string;
  labels: { next: string; previous: string };
}) {
  if (page === 1 && !hasMore) return null;
  return (
    <nav className="mt-8 flex items-center justify-between" aria-label="Pagination">
      {page > 1 ? <Link href={makeHref(page - 1)} className="btn-secondary btn-sm">← {labels.previous}</Link> : <span />}
      <span className="num text-sm text-fg-muted">{page}</span>
      {hasMore ? <Link href={makeHref(page + 1)} className="btn-secondary btn-sm">{labels.next} →</Link> : <span />}
    </nav>
  );
}
