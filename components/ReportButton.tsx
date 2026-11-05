"use client";

import { useActionState, useId, useState } from "react";
import { reportSubmission, type ReportState } from "@/app/submit/actions";
import { REPORT_REASONS } from "@/lib/constants";
import type { Dictionary } from "@/lib/i18n";

export function ReportButton({
  submissionId,
  t,
  errors,
}: {
  submissionId: string;
  t: Dictionary["report"];
  errors: Dictionary["errors"];
}) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState<ReportState, FormData>(reportSubmission, { status: "idle" });
  const id = useId();

  if (state.status === "ok") {
    return <p className="flex h-8 items-center text-sm text-fg-muted" role="status">{t.thanks}</p>;
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn-ghost btn-sm">
        {t.button}
      </button>
    );
  }

  return (
    <form action={action} className="card card-pad mt-2 w-full bg-bg-subtle" aria-labelledby={`${id}-title`}>
      <p id={`${id}-title`} className="font-medium">{t.title}</p>
      <input type="hidden" name="submissionId" value={submissionId} />
      <fieldset className="mt-3">
        <legend className="sr-only">{t.reason}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {REPORT_REASONS.map((r, n) => (
            <label
              key={r}
              className="flex h-10 cursor-pointer items-center gap-2.5 rounded-lg border border-border bg-bg px-3 text-sm has-[:checked]:border-accent has-[:checked]:bg-accent-soft"
            >
              <input type="radio" name="reason" value={r} required defaultChecked={n === 0} className="accent-[var(--accent)]" />
              {t.reasons[r]}
            </label>
          ))}
        </div>
      </fieldset>
      <label htmlFor={`${id}-details`} className="label mt-4">{t.details}</label>
      <textarea id={`${id}-details`} name="details" maxLength={500} rows={2} className="input" />
      {state.status === "error" && <p className="field-error" role="alert">{errors[state.error ?? "generic"]}</p>}
      <div className="mt-4 flex justify-end gap-2">
        <button type="button" onClick={() => setOpen(false)} className="btn-ghost btn-sm">{t.cancel}</button>
        <button type="submit" disabled={pending} className="btn-primary btn-sm">{t.submit}</button>
      </div>
    </form>
  );
}
