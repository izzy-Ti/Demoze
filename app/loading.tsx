import { getDictionary } from "@/lib/i18n";

export default function Loading() {
  const t = getDictionary("en");
  return (
    <div aria-busy="true">
      <span className="sr-only" role="status">{t.common.loading}</span>
      <div className="border-b border-border pb-8">
        <div className="skeleton h-4 w-32" />
        <div className="skeleton mt-4 h-10 w-2/3 max-w-md" />
        <div className="skeleton mt-4 h-4 w-48" />
      </div>
      <div className="mt-10 grid gap-6 lg:grid-cols-2">
        <div className="skeleton h-64" />
        <div className="skeleton h-64" />
      </div>
    </div>
  );
}
