"use client";

import { useActionState } from "react";
import { voteHelpful, type VoteState } from "@/app/submit/actions";

export function HelpfulButton({ submissionId, count, label }: { submissionId: string; count: number; label: string }) {
  const [state, action, pending] = useActionState<VoteState, FormData>(voteHelpful, { voted: false, count });
  return (
    <form action={action}>
      <input type="hidden" name="submissionId" value={submissionId} />
      <input type="hidden" name="count" value={state.count} />
      <button
        type="submit"
        disabled={pending || state.voted}
        aria-pressed={state.voted}
        className={`btn btn-sm border ${
          state.voted ? "border-accent-line bg-accent-soft text-accent-fg disabled:opacity-100" : "border-border text-fg-muted hover:border-border-strong hover:text-fg"
        }`}
      >
        <svg viewBox="0 0 20 20" aria-hidden="true" className="h-4 w-4 fill-none stroke-current stroke-[1.6]">
          <path d="M6.5 9 9.5 3c1.2 0 2 .9 2 2v2.5h4a1.5 1.5 0 0 1 1.5 1.8l-1.2 6A1.5 1.5 0 0 1 14.3 16.5H6.5zM6.5 9H3.5v7.5h3" strokeLinejoin="round" />
        </svg>
        {label}
        {state.count > 0 && <span className="num">{state.count}</span>}
      </button>
    </form>
  );
}
