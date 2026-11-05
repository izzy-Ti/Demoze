export function Stars({ value, label, size = "sm" }: { value: number; label: string; size?: "sm" | "md" }) {
  const cls = size === "md" ? "h-5 w-5" : "h-3.5 w-3.5";
  return (
    <span className="inline-flex items-center gap-1.5" role="img" aria-label={`${label}: ${value.toFixed(1)} / 5`}>
      <span aria-hidden="true" className="flex">
        {Array.from({ length: 5 }, (_, n) => {
          const fill = Math.max(0, Math.min(1, value - n));
          return (
            <span key={n} className={`relative ${cls}`}>
              <Star className={`absolute inset-0 ${cls} fill-border-strong`} />
              <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
                <Star className={`${cls} fill-accent`} />
              </span>
            </span>
          );
        })}
      </span>
    </span>
  );
}

function Star({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 20 20" className={className}>
      <path d="M10 1.8l2.5 5.2 5.7.7-4.2 3.9 1.1 5.6L10 14.5l-5.1 2.7 1.1-5.6-4.2-3.9 5.7-.7z" />
    </svg>
  );
}
