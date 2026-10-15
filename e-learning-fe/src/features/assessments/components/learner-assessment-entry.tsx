"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { useAssessmentAttempt } from "../hooks/use-assessment-attempt";
import { useLearnerAssessment } from "../hooks/use-learner-assessment";

import type {
  AssessmentAttemptStatus,
  AssessmentHistoryItem,
  LearnerAssessment,
} from "../types/assessment";

type LearnerAssessmentEntryProps = {
  accessToken: string;
  courseId: string;
  assessmentId: string;
  courseSlug: string;
  className?: string;
  includeHistory?: boolean;
  onAttemptReady?: (attemptId: string) => void;
  onViewResult?: (attemptId: string) => void;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function formatNumber(value?: number | null, fallback = "—") {
  if (value === undefined || value === null) {
    return fallback;
  }

  return String(value);
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "Not set";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Not set";
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function formatAssessmentType(type: string) {
  if (type === "QUIZ") {
    return "Quiz";
  }

  if (type === "PROJECT") {
    return "Project";
  }

  return type;
}

function formatAttemptStatus(status?: AssessmentAttemptStatus | string | null) {
  if (!status) {
    return "No attempt";
  }

  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getStateLabel(assessment: LearnerAssessment) {
  switch (assessment.state) {
    case "CAN_START":
      return "Ready";
    case "CAN_CONTINUE":
      return "In progress";
    case "COMPLETED":
      return "Completed";
    case "MAX_ATTEMPTS_REACHED":
      return "Max attempts reached";
    case "NOT_AVAILABLE":
      return "Not available";
    case "LOCKED":
      return "Locked";
    default:
      return "Assessment";
  }
}

function getPrimaryButtonLabel(assessment: LearnerAssessment) {
  if (assessment.primaryAction === "CONTINUE") {
    return "Continue attempt";
  }

  return assessment.type === "PROJECT" ? "Start project" : "Start quiz";
}

function getStateBadgeClasses(assessment: LearnerAssessment) {
  switch (assessment.state) {
    case "CAN_START":
      return "border-primary/20 bg-primary/5 text-primary";
    case "CAN_CONTINUE":
      return "border-primary/20 bg-primary/10 text-primary";
    case "COMPLETED":
      return "border-success/20 bg-success/5 text-success";
    case "MAX_ATTEMPTS_REACHED":
    case "NOT_AVAILABLE":
    case "LOCKED":
      return "border-border bg-muted text-muted-foreground";
    default:
      return "border-border bg-muted text-muted-foreground";
  }
}

function getAttemptStatusClasses(status: AssessmentAttemptStatus | string) {
  switch (status) {
    case "PASSED":
    case "GRADED":
      return "border-success/20 bg-success/5 text-success";
    case "FAILED":
    case "SUBMITTED":
      return "border-border bg-muted text-muted-foreground";
    case "IN_PROGRESS":
      return "border-primary/20 bg-primary/5 text-primary";
    default:
      return "border-border bg-muted text-muted-foreground";
  }
}

function isFinishedAttemptStatus(
  status?: AssessmentAttemptStatus | string | null,
) {
  return (
    status === "SUBMITTED" ||
    status === "GRADED" ||
    status === "PASSED" ||
    status === "FAILED"
  );
}

function AssessmentEntrySkeleton() {
  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="animate-pulse space-y-5">
        <div className="h-5 w-24 rounded bg-muted" />
        <div className="space-y-3">
          <div className="h-7 w-2/3 rounded bg-muted" />
          <div className="h-4 w-full rounded bg-muted" />
          <div className="h-4 w-4/5 rounded bg-muted" />
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="h-20 rounded-xl bg-muted" />
          <div className="h-20 rounded-xl bg-muted" />
          <div className="h-20 rounded-xl bg-muted" />
          <div className="h-20 rounded-xl bg-muted" />
        </div>
        <div className="h-11 w-40 rounded-pill bg-muted" />
      </div>
    </section>
  );
}

function AssessmentMetaItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-background p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className="mt-2 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function AttemptHistoryRow({
  attempt,
  onViewResult,
}: {
  attempt: AssessmentHistoryItem;
  onViewResult: (attemptId: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold">
            Attempt {attempt.attemptNumber}
          </p>
          <span
            className={cn(
              "rounded-pill border px-2.5 py-1 text-xs font-semibold",
              getAttemptStatusClasses(attempt.status),
            )}
          >
            {formatAttemptStatus(attempt.status)}
          </span>
        </div>

        <p className="mt-1 text-sm text-muted-foreground">
          {attempt.submittedAt
            ? `Submitted ${formatDateTime(attempt.submittedAt)}`
            : `Started ${formatDateTime(attempt.startedAt)}`}
        </p>

        {attempt.score !== null && attempt.score !== undefined ? (
          <p className="mt-1 text-sm text-muted-foreground">
            Score:{" "}
            <span className="font-semibold text-foreground">
              {attempt.score}
              {attempt.maxScore ? ` / ${attempt.maxScore}` : ""}
            </span>
          </p>
        ) : null}
      </div>

      {attempt.canViewResult ? (
        <button
          className="inline-flex min-h-10 items-center justify-center rounded-pill border border-border px-4 text-sm font-semibold transition hover:border-primary hover:text-primary"
          onClick={() => onViewResult(attempt.attemptId)}
          type="button"
        >
          View result
        </button>
      ) : null}
    </div>
  );
}

export function LearnerAssessmentEntry({
  accessToken,
  assessmentId,
  className,
  courseId,
  courseSlug,
  includeHistory = true,
  onAttemptReady,
  onViewResult,
}: LearnerAssessmentEntryProps) {
  const router = useRouter();
  const [actionError, setActionError] = useState<string | null>(null);

  const {
    assessment,
    error: loadError,
    history,
    isLoading,
    refetch,
  } = useLearnerAssessment({
    accessToken,
    assessmentId,
    courseId,
    includeHistory,
  });

  const { isStarting, startOrResume } = useAssessmentAttempt({
    accessToken,
    assessmentId,
    autoLoad: false,
    courseId,
  });

  const latestAttemptId = assessment?.latestAttempt?.attemptId ?? null;

  const primaryDisabled = useMemo(() => {
    if (!assessment) {
      return true;
    }

    return assessment.primaryAction === "NONE" || isStarting;
  }, [assessment, isStarting]);

  function navigateToAttempt(nextAttemptId: string) {
    if (onAttemptReady) {
      onAttemptReady(nextAttemptId);
      return;
    }

    router.push(
      `/courses/${courseSlug}/learn/assessments/${assessmentId}/attempts/${nextAttemptId}`,
    );
  }

  function navigateToResult(nextAttemptId: string) {
    if (onViewResult) {
      onViewResult(nextAttemptId);
      return;
    }

    router.push(
      `/courses/${courseSlug}/learn/assessments/${assessmentId}/attempts/${nextAttemptId}/result`,
    );
  }

  async function handlePrimaryAction() {
    if (!assessment || primaryDisabled) {
      return;
    }

    setActionError(null);

    try {
      const response = await startOrResume();
      navigateToAttempt(response.attemptId);
    } catch (error) {
      setActionError(
        error instanceof Error ? error.message : "Unable to open assessment.",
      );
    }
  }

  if (isLoading) {
    return <AssessmentEntrySkeleton />;
  }

  if (loadError || !assessment) {
    return (
      <section
        className={cn(
          "rounded-2xl border border-danger/20 bg-danger/5 p-6",
          className,
        )}
      >
        <p className="text-sm font-semibold text-danger">
          Unable to load assessment
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {loadError ?? "Assessment data is unavailable."}
        </p>
        <button
          className="mt-5 inline-flex min-h-10 items-center justify-center rounded-pill border border-danger/30 bg-background px-4 text-sm font-semibold text-danger transition hover:bg-danger/10"
          onClick={() => void refetch()}
          type="button"
        >
          Try again
        </button>
      </section>
    );
  }

  const visibleError = actionError;
  const attempts = history?.attempts ?? [];
  const latestAttemptFinished = isFinishedAttemptStatus(
    assessment.latestAttempt?.status,
  );

  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border border-border bg-card shadow-sm",
        className,
      )}
    >
      <div className="border-b border-border bg-background p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "rounded-pill border px-3 py-1 text-xs font-semibold",
                  getStateBadgeClasses(assessment),
                )}
              >
                {getStateLabel(assessment)}
              </span>

              <span className="rounded-pill border border-border bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                {formatAssessmentType(assessment.type)}
              </span>
            </div>

            <h2 className="mt-4 text-2xl font-semibold leading-tight text-foreground">
              {assessment.title}
            </h2>

            {assessment.description ? (
              <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
                {assessment.description}
              </p>
            ) : (
              <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
                Complete this assessment to check your understanding and track
                your course progress.
              </p>
            )}
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">
            <button
              className="inline-flex min-h-11 items-center justify-center rounded-pill border border-primary bg-primary px-6 text-sm font-semibold text-primary-foreground transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={primaryDisabled}
              onClick={() => void handlePrimaryAction()}
              type="button"
            >
              {isStarting ? "Opening..." : getPrimaryButtonLabel(assessment)}
            </button>

            {latestAttemptId && latestAttemptFinished ? (
              <button
                className="inline-flex min-h-11 items-center justify-center rounded-pill border border-border bg-background px-6 text-sm font-semibold transition hover:border-primary hover:text-primary"
                onClick={() => navigateToResult(latestAttemptId)}
                type="button"
              >
                Latest result
              </button>
            ) : null}
          </div>
        </div>

        {assessment.message ? (
          <p className="mt-5 rounded-xl border border-border bg-muted px-4 py-3 text-sm text-muted-foreground">
            {assessment.message}
          </p>
        ) : null}

        {visibleError ? (
          <p className="mt-5 rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
            {visibleError}
          </p>
        ) : null}
      </div>

      <div className="space-y-6 p-6">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <AssessmentMetaItem
            label="Total points"
            value={formatNumber(assessment.totalPoints)}
          />
          <AssessmentMetaItem
            label="Passing score"
            value={
              assessment.passingScore === null ||
              assessment.passingScore === undefined
                ? "No minimum"
                : String(assessment.passingScore)
            }
          />
          <AssessmentMetaItem
            label="Time limit"
            value={
              assessment.timeLimitMinutes
                ? `${assessment.timeLimitMinutes} minutes`
                : "No limit"
            }
          />
          <AssessmentMetaItem
            label="Attempts"
            value={
              assessment.maxAttempts
                ? `${assessment.attemptsUsed} / ${assessment.maxAttempts}`
                : `${assessment.attemptsUsed} used · Unlimited`
            }
          />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <AssessmentMetaItem
            label="Available from"
            value={formatDateTime(assessment.availableFrom)}
          />
          <AssessmentMetaItem
            label="Available until"
            value={formatDateTime(assessment.availableUntil)}
          />
        </div>

        {assessment.latestAttempt ? (
          <div className="rounded-xl border border-border bg-background p-4">
            <p className="text-sm font-semibold">Latest attempt</p>

            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Status
                </p>
                <p className="mt-1 text-sm font-semibold">
                  {formatAttemptStatus(assessment.latestAttempt.status)}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Attempt
                </p>
                <p className="mt-1 text-sm font-semibold">
                  #{assessment.latestAttempt.attemptNumber}
                </p>
              </div>

              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Score
                </p>
                <p className="mt-1 text-sm font-semibold">
                  {assessment.latestAttempt.score !== null &&
                  assessment.latestAttempt.score !== undefined
                    ? `${assessment.latestAttempt.score}${
                        assessment.latestAttempt.maxScore
                          ? ` / ${assessment.latestAttempt.maxScore}`
                          : ""
                      }`
                    : "Not graded"}
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {includeHistory ? (
          <div>
            <div className="flex items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-semibold">Attempt history</h3>
                <p className="mt-1 text-sm text-muted-foreground">
                  Review your previous submissions and results.
                </p>
              </div>
            </div>

            {attempts.length > 0 ? (
              <div className="mt-4 space-y-3">
                {attempts.map((attempt) => (
                  <AttemptHistoryRow
                    attempt={attempt}
                    key={attempt.attemptId}
                    onViewResult={navigateToResult}
                  />
                ))}
              </div>
            ) : (
              <div className="mt-4 rounded-xl border border-dashed border-border bg-background p-5 text-sm text-muted-foreground">
                You have not started this assessment yet.
              </div>
            )}
          </div>
        ) : null}
      </div>
    </section>
  );
}
