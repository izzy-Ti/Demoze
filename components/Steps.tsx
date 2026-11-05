/** 3-step progress for the submit flow. */
export function Steps({ current, labels }: { current: 1 | 2 | 3; labels: string }) {
  const names = labels.split(",");
  return (
    <ol className="flex items-center gap-2 text-sm">
      {names.map((name, n) => {
        const step = n + 1;
        const state = step < current ? "done" : step === current ? "current" : "todo";
        return (
          <li key={name} className="flex items-center gap-2" aria-current={state === "current" ? "step" : undefined}>
            {n > 0 && <span aria-hidden="true" className={`h-px w-6 sm:w-10 ${state === "todo" ? "bg-border-strong" : "bg-accent"}`} />}
            <span
              className={`grid h-6 w-6 place-items-center rounded-full text-xs font-semibold ${
                state === "todo" ? "border border-border-strong text-fg-muted" : "bg-accent text-white"
              }`}
            >
              {state === "done" ? "✓" : step}
            </span>
            <span className={state === "todo" ? "text-fg-muted" : "font-medium"}>{name}</span>
          </li>
        );
      })}
    </ol>
  );
}
