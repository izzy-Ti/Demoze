export function VerifiedBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex h-6 items-center gap-1 rounded-full bg-accent-soft px-2 text-xs font-medium text-accent-fg ring-1 ring-inset ring-accent-line">
      <svg aria-hidden="true" viewBox="0 0 20 20" className="h-3.5 w-3.5 fill-current">
        <path d="M10 1.5l2.1 1.6 2.6-.2.9 2.5 2.2 1.4-.8 2.5.8 2.5-2.2 1.4-.9 2.5-2.6-.2L10 18.5l-2.1-1.6-2.6.2-.9-2.5-2.2-1.4.8-2.5-.8-2.5 2.2-1.4.9-2.5 2.6.2zm3.3 5.6-4.6 4.6-2-2-1.1 1.1 3.1 3.1 5.7-5.7z" />
      </svg>
      {label}
    </span>
  );
}
