"use client";

import { useActionState, useEffect, useRef, useState, startTransition } from "react";
import { useRouter } from "next/navigation";
import { submitSalary, type SubmitState } from "./actions";
import { CompanyInput } from "@/components/CompanyInput";
import { Steps } from "@/components/Steps";
import { VerifyStep } from "./VerifyStep";
import { CITIES, EMPLOYMENT_TYPES, INDUSTRIES } from "@/lib/constants";
import { fmt, type Dictionary } from "@/lib/i18n";
import { formatNumber } from "@/lib/format";
import { netPay } from "@/lib/tax";
import { fieldErrorsFrom, formDataToObject, submissionSchema, type FieldErrors } from "@/lib/validation";

export type SubmitDict = Pick<Dictionary, "submit" | "verify" | "errors" | "employment" | "industries" | "home">;

export function SubmitFlow({ formToken, initialCompany, t }: { formToken: string; initialCompany: string; t: SubmitDict }) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState<SubmitState, FormData>(submitSalary, { status: "idle" });
  const [clientErrors, setClientErrors] = useState<FieldErrors>({});
  const [step, setStep] = useState<1 | 2>(1);
  const [salaryText, setSalaryText] = useState("");
  const errorRef = useRef<HTMLDivElement>(null);

  const thanksUrl =
    state.status === "ok"
      ? `/submit/thanks?c=${encodeURIComponent(state.companySlug)}&t=${encodeURIComponent(state.titleSlug)}${state.flagged ? "&f=1" : ""}`
      : "/submit/thanks";

  useEffect(() => {
    if (state.status === "ok") {
      if (state.submissionId) {
        setStep(2);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } else router.push("/submit/thanks");
    } else if (state.status === "error") errorRef.current?.focus();
  }, [state, router]);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = submissionSchema.safeParse(formDataToObject(fd));
    if (!parsed.success) {
      setClientErrors(fieldErrorsFrom(parsed.error));
      requestAnimationFrame(() => errorRef.current?.focus());
      return;
    }
    setClientErrors({});
    // Manual dispatch (not <form action>) keeps the user's input if the server rejects it.
    startTransition(() => formAction(fd));
  }

  const salary = Number(salaryText.replace(/[,\s]/g, ""));
  const net = salary >= 500 && salary <= 2_000_000 ? netPay(salary).net : null;

  const header = (current: 1 | 2) => (
    <div className="mb-8">
      <Steps current={current} labels={t.submit.stepLabels} />
      <h1 className="mt-8 text-3xl font-semibold tracking-tight sm:text-4xl">{current === 1 ? t.submit.title : t.verify.title}</h1>
      <p className="mt-2 text-fg-muted">{current === 1 ? t.submit.intro : t.verify.intro}</p>
    </div>
  );

  if (step === 2 && state.status === "ok" && state.submissionId) {
    return (
      <div className="mx-auto max-w-xl">
        {header(2)}
        <VerifyStep submissionId={state.submissionId} t={t.verify} onDone={() => router.push(thanksUrl)} />
      </div>
    );
  }

  const errors: FieldErrors = { ...(state.status === "error" ? (state.fields ?? {}) : {}), ...clientErrors };
  const formError = state.status === "error" ? state.error : undefined;
  const hasErrors = Object.keys(errors).length > 0 || !!formError;
  const err = (f: keyof FieldErrors) => (errors[f] ? <p id={`${f}-error`} className="field-error">{t.errors[errors[f]!]}</p> : null);
  const described = (f: keyof FieldErrors) => (errors[f] ? `${f}-error` : undefined);

  return (
    <div className="mx-auto max-w-xl">
      {header(1)}

      <div ref={errorRef} tabIndex={-1} className="outline-none" aria-live="assertive">
        {hasErrors && (
          <p className="mb-6 rounded-lg border border-bad/40 bg-bad/5 px-4 py-3 text-sm font-medium text-bad" role="alert">
            {formError ? t.errors[formError] : t.errors.fixFields}
          </p>
        )}
      </div>

      <form onSubmit={onSubmit} noValidate className="space-y-12">
        <input type="hidden" name="formToken" value={formToken} />
        <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
          <label htmlFor="website">{t.submit.honeypot}</label>
          <input id="website" name="website" type="text" tabIndex={-1} autoComplete="off" />
        </div>

        <Section title={t.submit.sectionJob}>
          <CompanyInput
            name="company"
            label={t.submit.companyLabel}
            hint={t.submit.companyHint}
            suggestionsLabel={t.submit.suggestions}
            defaultValue={initialCompany}
            error={errors.company ? t.errors[errors.company] : undefined}
          />
          <div>
            <label htmlFor="jobTitle" className="label">{t.submit.titleLabel}</label>
            <input id="jobTitle" name="jobTitle" required maxLength={100} placeholder={t.submit.titlePlaceholder} className="input" aria-invalid={!!errors.jobTitle} aria-describedby={described("jobTitle")} autoComplete="organization-title" />
            {err("jobTitle")}
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="experienceYears" className="label">{t.submit.experienceLabel}</label>
              <input id="experienceYears" name="experienceYears" required type="number" inputMode="numeric" min={0} max={50} className="input num" aria-invalid={!!errors.experienceYears} aria-describedby={described("experienceYears")} />
              {err("experienceYears")}
            </div>
            <div>
              <label htmlFor="city" className="label">{t.submit.cityLabel}</label>
              <input id="city" name="city" list="city-list" maxLength={60} placeholder={t.submit.cityPlaceholder} className="input" aria-invalid={!!errors.city} aria-describedby={described("city")} />
              <datalist id="city-list">{CITIES.map((c) => <option key={c} value={c} />)}</datalist>
              {err("city")}
            </div>
          </div>
          <div>
            <label htmlFor="industry" className="label">{t.submit.industryLabel}</label>
            <select id="industry" name="industry" defaultValue="" className="input">
              <option value="">{t.submit.industryNone}</option>
              {INDUSTRIES.map((i) => <option key={i} value={i}>{t.industries[i]}</option>)}
            </select>
          </div>
          <fieldset>
            <legend className="label">{t.submit.typeLabel}</legend>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {EMPLOYMENT_TYPES.map((type) => (
                <label key={type} className="flex h-10 cursor-pointer items-center justify-center rounded-lg border border-border-strong text-sm font-medium transition-colors has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:checked]:text-accent-fg has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--ring)] hover:bg-bg-subtle">
                  <input type="radio" name="employmentType" value={type} defaultChecked={type === "full_time"} className="sr-only" />
                  {t.employment[type]}
                </label>
              ))}
            </div>
            {err("employmentType")}
          </fieldset>
          <label className="flex cursor-pointer items-center gap-2.5 text-sm">
            <input type="checkbox" name="stillEmployed" defaultChecked className="h-4 w-4 accent-[var(--accent)]" />
            {t.submit.stillEmployedLabel}
          </label>
        </Section>

        <Section title={t.submit.sectionPay}>
          <div>
            <label htmlFor="monthlySalary" className="label">{t.submit.salaryLabel}</label>
            <div className="relative">
              <input
                id="monthlySalary"
                name="monthlySalary"
                required
                inputMode="numeric"
                pattern="[0-9,]*"
                placeholder="25,000"
                value={salaryText}
                onChange={(e) => setSalaryText(e.target.value)}
                onBlur={() => salary > 0 && setSalaryText(formatNumber(salary))}
                className="input num h-14 pr-14 text-2xl font-semibold"
                aria-invalid={!!errors.monthlySalary}
                aria-describedby={`salary-net${errors.monthlySalary ? " monthlySalary-error" : ""}`}
              />
              <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-fg-subtle">ETB</span>
            </div>
            <p id="salary-net" className="hint num h-5">{net != null ? fmt(t.submit.netPreview, { n: formatNumber(Math.round(net)) }) : ""}</p>
            {err("monthlySalary")}
          </div>
          <div>
            <label htmlFor="bonus" className="label">{t.submit.bonusLabel}</label>
            <div className="relative">
              <input id="bonus" name="bonus" inputMode="numeric" pattern="[0-9,]*" className="input num pr-14" aria-invalid={!!errors.bonus} aria-describedby={described("bonus")} />
              <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-fg-subtle">ETB</span>
            </div>
            {err("bonus")}
          </div>
        </Section>

        <Section title={t.submit.sectionReview} badge={t.submit.optional}>
          <RatingInput label={t.submit.ratingLabel} noneLabel={t.submit.ratingNone} />
          {err("rating")}
          <p className="notice" id="review-warning">{t.submit.reviewWarning}</p>
          <ReviewField name="pros" label={t.submit.prosLabel} error={errors.pros ? t.errors[errors.pros] : undefined} charsLeft={t.submit.charsLeft} />
          <ReviewField name="cons" label={t.submit.consLabel} error={errors.cons ? t.errors[errors.cons] : undefined} charsLeft={t.submit.charsLeft} />
        </Section>

        <div className="border-t border-border pt-8">
          <button type="submit" disabled={pending} className="btn-primary btn-lg w-full">
            {pending && <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />}
            {pending ? t.submit.submitting : t.submit.continue}
          </button>
          <ul className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-fg-muted">
            {[t.home.trust1Title, t.home.trust2Title].map((x) => (
              <li key={x} className="flex items-center gap-1.5"><span aria-hidden="true" className="text-good">✓</span>{x}</li>
            ))}
          </ul>
        </div>
      </form>
    </div>
  );
}

function Section({ title, badge, children }: { title: string; badge?: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-5">
      <legend className="mb-5 flex w-full items-center gap-2 border-b border-border pb-3 text-lg font-semibold tracking-tight">
        {title}
        {badge && <span className="badge">{badge}</span>}
      </legend>
      {children}
    </fieldset>
  );
}

/** Star rating as a real radio group. */
function RatingInput({ label, noneLabel }: { label: string; noneLabel: string }) {
  const [value, setValue] = useState(0);
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <fieldset>
      <legend className="label">{label}</legend>
      <div className="flex items-center gap-3" onMouseLeave={() => setHover(0)}>
        <div className="flex gap-0.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="cursor-pointer rounded-md p-0.5 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--ring)]" onMouseEnter={() => setHover(n)}>
              <input type="radio" name="rating" value={n} checked={value === n} onChange={() => setValue(n)} className="sr-only" />
              <span className="sr-only">{n} / 5</span>
              <svg aria-hidden="true" viewBox="0 0 20 20" className={`h-8 w-8 transition-colors ${n <= shown ? "fill-accent" : "fill-border-strong"}`}>
                <path d="M10 1.8l2.5 5.2 5.7.7-4.2 3.9 1.1 5.6L10 14.5l-5.1 2.7 1.1-5.6-4.2-3.9 5.7-.7z" />
              </svg>
            </label>
          ))}
        </div>
        <input type="radio" name="rating" value="" checked={value === 0} onChange={() => setValue(0)} className="hidden" aria-hidden="true" tabIndex={-1} />
        {value > 0 && (
          <button type="button" onClick={() => setValue(0)} className="text-sm text-fg-muted hover:text-fg">
            {noneLabel}
          </button>
        )}
      </div>
    </fieldset>
  );
}

function ReviewField({ name, label, error, charsLeft }: { name: string; label: string; error?: string; charsLeft: string }) {
  const [len, setLen] = useState(0);
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <label htmlFor={name} className="label">{label}</label>
        <span id={`${name}-count`} className={`num text-xs ${1000 - len < 100 ? "text-bad" : "text-fg-subtle"}`}>{fmt(charsLeft, { n: 1000 - len })}</span>
      </div>
      <textarea
        id={name}
        name={name}
        rows={3}
        maxLength={1000}
        onChange={(e) => setLen(e.target.value.length)}
        className="input resize-y"
        aria-invalid={!!error}
        aria-describedby={`review-warning ${name}-count${error ? ` ${name}-error` : ""}`}
      />
      {error && <p id={`${name}-error`} className="field-error">{error}</p>}
    </div>
  );
}
