"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";
import type { Dictionary } from "@/lib/i18n";

export function LoginForm({ t }: { t: Dictionary["admin"] }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});
  return (
    <form action={action} className="card card-pad space-y-4">
      <div>
        <label htmlFor="password" className="label">{t.password}</label>
        <input id="password" name="password" type="password" required autoComplete="current-password" className="input" aria-invalid={!!state.error} />
        {state.error && <p className="field-error" role="alert">{t[state.error]}</p>}
      </div>
      <button disabled={pending} className="btn-primary w-full">{t.login}</button>
    </form>
  );
}
