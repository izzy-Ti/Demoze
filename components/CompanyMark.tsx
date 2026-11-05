/** Neutral monogram tile for a company (we never use company logos). */
export function CompanyMark({ name, size = "md" }: { name: string; size?: "md" | "lg" }) {
  const letter = name.trim().charAt(0).toUpperCase();
  return (
    <span
      aria-hidden="true"
      className={`grid shrink-0 place-items-center rounded-lg border border-border bg-bg-subtle font-semibold text-fg-muted ${
        size === "lg" ? "h-14 w-14 rounded-xl text-xl" : "h-9 w-9 text-sm"
      }`}
    >
      {letter}
    </span>
  );
}
