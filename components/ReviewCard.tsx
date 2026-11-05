import type { PublicReview } from "@/lib/stats";
import { fmt, type Dictionary } from "@/lib/i18n";
import { formatBand, formatMonthYear } from "@/lib/format";
import { displayTitle } from "@/lib/normalize";
import { experienceBucket } from "@/lib/stats-core";
import { VerifiedBadge } from "./VerifiedBadge";
import { ReportButton } from "./ReportButton";
import { HelpfulButton } from "./HelpfulButton";
import { Stars } from "./Stars";

/**
 * One review. Salary BAND only (never the exact figure), experience bucket
 * (never exact years), month/year only (never the exact date).
 */
export function ReviewCard({ review, t, showBand }: { review: PublicReview; t: Dictionary; showBand: boolean }) {
  const employment = review.employmentType
    ? t.employment[review.employmentType as keyof Dictionary["employment"]]
    : null;
  const meta = [
    employment,
    fmt(t.review.experience, { k: experienceBucket(review.experienceYears) }),
    review.stillEmployed ? t.review.currentEmployee : t.review.formerEmployee,
  ].filter(Boolean);

  return (
    <article className="py-6">
      <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">{displayTitle(review.title)}</h3>
            {review.verified && <VerifiedBadge label={t.common.verified} />}
          </div>
          <p className="mt-1 text-sm text-fg-muted">{meta.join(" · ")}</p>
        </div>
        <time className="shrink-0 text-sm text-fg-subtle">{formatMonthYear(review.createdAt)}</time>
      </header>

      <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
        {showBand ? (
          <p className="num text-lg font-semibold">
            {formatBand(review.salary)}
            <span className="ml-1 font-sans text-sm font-normal text-fg-muted">{t.common.perMonth}</span>
          </p>
        ) : (
          <p className="text-sm text-fg-subtle">{t.review.bandHidden}</p>
        )}
        {review.rating != null && <Stars value={review.rating} label={t.common.rating} />}
      </div>

      {(review.pros || review.cons) && (
        <dl className="mt-4 grid gap-4 text-[0.9375rem] leading-relaxed sm:grid-cols-2">
          {review.pros && (
            <div>
              <dt className="flex items-center gap-1.5 text-sm font-medium text-good">
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-good" />{t.review.pros}
              </dt>
              <dd className="mt-1 whitespace-pre-line break-words">{review.pros}</dd>
            </div>
          )}
          {review.cons && (
            <div>
              <dt className="flex items-center gap-1.5 text-sm font-medium text-bad">
                <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-bad" />{t.review.cons}
              </dt>
              <dd className="mt-1 whitespace-pre-line break-words">{review.cons}</dd>
            </div>
          )}
        </dl>
      )}

      <footer className="mt-4 flex flex-wrap items-start gap-2">
        <HelpfulButton submissionId={review.id} count={review.helpful} label={t.review.helpful} />
        <ReportButton submissionId={review.id} t={t.report} errors={t.errors} />
      </footer>
    </article>
  );
}
