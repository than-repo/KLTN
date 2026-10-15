"use client";

import { useRouter } from "next/navigation";

import type {
  AssessmentAttemptStatus,
  AssessmentHistory,
  AssessmentHistoryItem,
} from "../types/assessment";

type AttemptHistoryProps = {
  history: AssessmentHistory | null;
  courseSlug: string;
  assessmentId: string;
  className?: string;
  onContinueAttempt?: (attemptId: string) => void;
  onViewResult?: (attemptId: string) => void;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatStatus(status: AssessmentAttemptStatus | string) {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getAttemptStatusClasses(status: AssessmentAttemptStatus | string) {
  switch (status) {
    case "PASSED":
    case "GRADED":
      return "border-success/20 bg-success/5 text-success";
    case "FAILED":
      return "border-danger/20 bg-danger/5 text-danger";
    case "IN_PROGRESS":
      return "border-primary/20 bg-primary/5 text-primary";
    case "SUBMITTED":
    default:
      return "border-border bg-muted text-muted-foreground";
  }
}

function getScoreLabel(score?: number | null, maxScore?: number | null) {
  if (score === undefined || score === null) {
    return "Not graded";
  }

  if (maxScore === undefined || maxScore === null) {
    return String(score);
  }

  return `${score} / ${maxScore}`;
}

function getAttemptDateLabel(attempt: AssessmentHistoryItem) {
  if (attempt.submittedAt) {
    return `Submitted ${formatDateTime(attempt.submittedAt)}`;
  }

  return `Started ${formatDateTime(attempt.startedAt)}`;
}

function EmptyAttemptHistory() {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-background p-6 text-center">
      <p className="text-sm font-semibold text-foreground">No attempts yet</p>

      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Start this assessment when you are ready. Your attempts will appear
        here.
      </p>
    </div>
  );
}

function AttemptHistorySkeleton() {
  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="animate-pulse space-y-5">
        <div>
          <div className="h-5 w-36 rounded bg-muted" />
          <div className="mt-3 h-4 w-64 rounded bg-muted" />
        </div>

        <div className="space-y-3">
          <div className="h-24 rounded-xl bg-muted" />
          <div className="h-24 rounded-xl bg-muted" />
          <div className="h-24 rounded-xl bg-muted" />
        </div>
      </div>
    </section>
  );
}

function AttemptHistoryRow({
  attempt,
  assessmentId,
  courseSlug,
  onContinueAttempt,
  onViewResult,
}: {
  attempt: AssessmentHistoryItem;
  assessmentId: string;
  courseSlug: string;
  onContinueAttempt?: (attemptId: string) => void;
  onViewResult?: (attemptId: string) => void;
}) {
  const router = useRouter();

  function continueAttempt() {
    if (onContinueAttempt) {
      onContinueAttempt(attempt.attemptId);
      return;
    }

    router.push(
      `/courses/${courseSlug}/learn/assessments/${assessmentId}/attempts/${attempt.attemptId}`,
    );
  }

  function viewResult() {
    if (onViewResult) {
      onViewResult(attempt.attemptId);
      return;
    }

    router.push(
      `/courses/${courseSlug}/learn/assessments/${assessmentId}/attempts/${attempt.attemptId}/result`,
    );
  }

  return (
    <article className="rounded-2xl border border-border bg-background p-4 transition hover:border-primary/40">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-foreground">
              Attempt #{attempt.attemptNumber}
            </p>

            <span
              className={cn(
                "rounded-pill border px-3 py-1 text-xs font-semibold",
                getAttemptStatusClasses(attempt.status),
              )}
            >
              {formatStatus(attempt.status)}
            </span>

            {attempt.passed ? (
              <span className="rounded-pill border border-success/20 bg-success/5 px-3 py-1 text-xs font-semibold text-success">
                Passed
              </span>
            ) : null}
          </div>

          <p className="mt-2 text-sm text-muted-foreground">
            {getAttemptDateLabel(attempt)}
          </p>

          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Score
              </p>

              <p className="mt-1 text-sm font-semibold text-foreground">
                {getScoreLabel(attempt.score, attempt.maxScore)}
              </p>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Status
              </p>

              <p className="mt-1 text-sm font-semibold text-foreground">
                {formatStatus(attempt.status)}
              </p>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          {attempt.canContinue ? (
            <button
              className="inline-flex min-h-10 items-center justify-center rounded-pill border border-primary bg-primary px-4 text-sm font-semibold text-primary-foreground transition active:scale-95"
              onClick={continueAttempt}
              type="button"
            >
              Continue
            </button>
          ) : null}

          {attempt.canViewResult ? (
            <button
              className="inline-flex min-h-10 items-center justify-center rounded-pill border border-border bg-card px-4 text-sm font-semibold transition hover:border-primary hover:text-primary"
              onClick={viewResult}
              type="button"
            >
              View result
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function AttemptHistory({
  assessmentId,
  className,
  courseSlug,
  history,
  onContinueAttempt,
  onViewResult,
}: AttemptHistoryProps) {
  if (history === null) {
    return <AttemptHistorySkeleton />;
  }

  const attempts = history.attempts ?? [];

  return (
    <section
      className={cn(
        "rounded-2xl border border-border bg-card p-6 shadow-sm",
        className,
      )}
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-foreground">
            Attempt history
          </h2>

          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Track your previous attempts, scores, and review availability.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-background px-4 py-3 text-sm">
          <span className="font-semibold text-foreground">
            {history.attemptsUsed}
          </span>{" "}
          <span className="text-muted-foreground">
            used
            {history.maxAttempts
              ? ` / ${history.maxAttempts} max`
              : " · unlimited"}
          </span>
        </div>
      </div>

      {history.attemptsRemaining !== undefined &&
      history.attemptsRemaining !== null ? (
        <p className="mt-4 rounded-xl border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
          Attempts remaining:{" "}
          <span className="font-semibold text-foreground">
            {history.attemptsRemaining}
          </span>
        </p>
      ) : null}

      {attempts.length > 0 ? (
        <div className="mt-5 space-y-3">
          {attempts.map((attempt) => (
            <AttemptHistoryRow
              assessmentId={assessmentId}
              attempt={attempt}
              courseSlug={courseSlug}
              key={attempt.attemptId}
              onContinueAttempt={onContinueAttempt}
              onViewResult={onViewResult}
            />
          ))}
        </div>
      ) : (
        <div className="mt-5">
          <EmptyAttemptHistory />
        </div>
      )}
    </section>
  );
}
