"use client";

import { useRouter } from "next/navigation";

import { useAttemptResult } from "../hooks/use-attempt-result";

import type {
  AssessmentAttemptResultAnswer,
  AssessmentAttemptResultProjectSubmission,
  AssessmentAttemptStatus,
  AssessmentQuestionType,
  ProjectSubmissionStatus,
} from "../types/assessment";

type AttemptResultProps = {
  accessToken: string;
  courseId: string;
  assessmentId: string;
  attemptId: string;
  courseSlug: string;
  className?: string;
  onRetakeReady?: (attemptId: string) => void;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function TextContent({
  children,
  className,
}: {
  children?: string | null;
  className?: string;
}) {
  if (!children) {
    return null;
  }

  return (
    <p className={cn("whitespace-pre-line break-words", className)}>
      {children}
    </p>
  );
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

function formatStatus(
  status: AssessmentAttemptStatus | ProjectSubmissionStatus,
) {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatQuestionType(type: AssessmentQuestionType) {
  switch (type) {
    case "MULTIPLE_CHOICE":
      return "Multiple choice";
    case "TRUE_FALSE":
      return "True / False";
    case "FILL_IN_THE_BLANK":
      return "Fill in the blank";
    case "PROJECT":
      return "Project";
    default:
      return type;
  }
}

function getAttemptStatusClasses(
  status: AssessmentAttemptStatus,
  passed: boolean,
) {
  if (passed || status === "PASSED") {
    return "border-success/20 bg-success/5 text-success";
  }

  if (status === "FAILED") {
    return "border-danger/20 bg-danger/5 text-danger";
  }

  if (status === "IN_PROGRESS") {
    return "border-primary/20 bg-primary/5 text-primary";
  }

  return "border-border bg-muted text-muted-foreground";
}

function getProjectStatusClasses(status: ProjectSubmissionStatus) {
  switch (status) {
    case "ACCEPTED":
    case "REVIEWED":
      return "border-success/20 bg-success/5 text-success";
    case "REJECTED":
    case "NEEDS_CHANGES":
      return "border-danger/20 bg-danger/5 text-danger";
    case "SUBMITTED":
    default:
      return "border-primary/20 bg-primary/5 text-primary";
  }
}

function getAnswerStatusClasses(answer: AssessmentAttemptResultAnswer) {
  if (answer.isCorrect === true) {
    return "border-success/20 bg-success/5 text-success";
  }

  if (answer.isCorrect === false) {
    return "border-danger/20 bg-danger/5 text-danger";
  }

  return "border-border bg-muted text-muted-foreground";
}

function getAnswerStatusLabel(answer: AssessmentAttemptResultAnswer) {
  if (answer.isCorrect === true) {
    return "Correct";
  }

  if (answer.isCorrect === false) {
    return "Incorrect";
  }

  return "Not graded";
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

function getScorePercent(score?: number | null, maxScore?: number | null) {
  if (
    score === undefined ||
    score === null ||
    maxScore === undefined ||
    maxScore === null ||
    maxScore <= 0
  ) {
    return null;
  }

  return Math.round((score / maxScore) * 100);
}

function ResultSkeleton() {
  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="animate-pulse space-y-6">
        <div className="h-5 w-24 rounded bg-muted" />

        <div className="space-y-3">
          <div className="h-8 w-2/3 rounded bg-muted" />
          <div className="h-4 w-full rounded bg-muted" />
          <div className="h-4 w-4/5 rounded bg-muted" />
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="h-24 rounded-xl bg-muted" />
          <div className="h-24 rounded-xl bg-muted" />
          <div className="h-24 rounded-xl bg-muted" />
        </div>

        <div className="h-56 rounded-2xl bg-muted" />
      </div>
    </section>
  );
}

function ResultMetaCard({
  label,
  value,
}: {
  label: string;
  value: string | number;
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

function ExternalResultLink({
  href,
  label,
}: {
  href?: string | null;
  label: string;
}) {
  if (!href) {
    return null;
  }

  return (
    <a
      className="inline-flex min-h-10 items-center justify-center rounded-pill border border-border bg-background px-4 text-sm font-semibold transition hover:border-primary hover:text-primary"
      href={href}
      rel="noreferrer"
      target="_blank"
    >
      {label}
    </a>
  );
}

function ResultAnswerCard({
  answer,
  index,
}: {
  answer: AssessmentAttemptResultAnswer;
  index: number;
}) {
  return (
    <article className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-pill border border-border bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
              Question {index + 1}
            </span>

            <span className="rounded-pill border border-border bg-background px-3 py-1 text-xs font-semibold text-muted-foreground">
              {formatQuestionType(answer.questionType)}
            </span>

            <span
              className={cn(
                "rounded-pill border px-3 py-1 text-xs font-semibold",
                getAnswerStatusClasses(answer),
              )}
            >
              {getAnswerStatusLabel(answer)}
            </span>
          </div>

          <div className="mt-4 text-base font-semibold leading-7 text-foreground">
            <TextContent>{answer.questionText}</TextContent>
          </div>
        </div>

        <span className="shrink-0 rounded-pill border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
          {getScoreLabel(answer.pointsEarned, answer.points)}
        </span>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-border bg-background p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Your answer
          </p>

          <TextContent className="mt-2 text-sm leading-6 text-foreground">
            {answer.learnerAnswer || "No answer submitted."}
          </TextContent>
        </div>

        {answer.correctAnswer ? (
          <div className="rounded-xl border border-success/20 bg-success/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-success">
              Correct answer
            </p>

            <TextContent className="mt-2 text-sm leading-6 text-foreground">
              {answer.correctAnswer}
            </TextContent>
          </div>
        ) : null}
      </div>

      {answer.explanation ? (
        <div className="mt-4 rounded-xl border border-border bg-muted p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Explanation
          </p>

          <TextContent className="mt-2 text-sm leading-6 text-foreground">
            {answer.explanation}
          </TextContent>
        </div>
      ) : null}
    </article>
  );
}

function ProjectSubmissionResult({
  submission,
}: {
  submission: AssessmentAttemptResultProjectSubmission;
}) {
  return (
    <article className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <span
            className={cn(
              "rounded-pill border px-3 py-1 text-xs font-semibold",
              getProjectStatusClasses(submission.status),
            )}
          >
            {formatStatus(submission.status)}
          </span>

          <h3 className="mt-4 text-xl font-semibold text-foreground">
            Project submission
          </h3>

          <p className="mt-2 text-sm text-muted-foreground">
            Submitted {formatDateTime(submission.submittedAt)}
          </p>
        </div>

        <span className="shrink-0 rounded-pill border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
          {getScoreLabel(submission.score)}
        </span>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <ExternalResultLink href={submission.githubUrl} label="Open GitHub" />
        <ExternalResultLink href={submission.deployUrl} label="Open deploy" />
        <ExternalResultLink
          href={submission.documentUrl}
          label="Open document"
        />
      </div>

      {submission.note ? (
        <div className="mt-5 rounded-xl border border-border bg-background p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Your note
          </p>

          <TextContent className="mt-2 text-sm leading-6 text-foreground">
            {submission.note}
          </TextContent>
        </div>
      ) : null}

      {submission.feedback ? (
        <div className="mt-5 rounded-xl border border-border bg-muted p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Instructor feedback
          </p>

          <TextContent className="mt-2 text-sm leading-6 text-foreground">
            {submission.feedback}
          </TextContent>
        </div>
      ) : null}

      {submission.gradedAt ? (
        <p className="mt-4 text-xs text-muted-foreground">
          Graded {formatDateTime(submission.gradedAt)}
        </p>
      ) : null}
    </article>
  );
}

export function AttemptResult({
  accessToken,
  assessmentId,
  attemptId,
  className,
  courseId,
  courseSlug,
  onRetakeReady,
}: AttemptResultProps) {
  const assessmentEntryHref = `/courses/${courseSlug}/learn?assessment=${encodeURIComponent(
    assessmentId,
  )}`;
  const router = useRouter();

  const { error, isLoading, isRetaking, refetch, result, retake } =
    useAttemptResult({
      accessToken,
      assessmentId,
      attemptId,
      courseId,
    });

  async function handleRetake() {
    try {
      const response = await retake();

      if (onRetakeReady) {
        onRetakeReady(response.attemptId);
        return;
      }

      router.push(
        `/courses/${courseSlug}/learn/assessments/${assessmentId}/attempts/${response.attemptId}`,
      );
    } catch {
      // The hook already exposes the error.
    }
  }

  function navigateBackToAssessment() {
    router.push(assessmentEntryHref);
  }

  if (isLoading) {
    return <ResultSkeleton />;
  }

  if (error || !result) {
    return (
      <section
        className={cn(
          "rounded-2xl border border-danger/20 bg-danger/5 p-6",
          className,
        )}
      >
        <p className="text-sm font-semibold text-danger">
          Unable to load result
        </p>

        <p className="mt-2 text-sm text-muted-foreground">
          {error ?? "Result data is unavailable."}
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            className="inline-flex min-h-10 items-center justify-center rounded-pill border border-danger/30 bg-background px-4 text-sm font-semibold text-danger transition hover:bg-danger/10"
            onClick={() => void refetch()}
            type="button"
          >
            Try again
          </button>

          <button
            className="inline-flex min-h-10 items-center justify-center rounded-pill border border-border bg-background px-4 text-sm font-semibold transition hover:border-primary hover:text-primary"
            onClick={navigateBackToAssessment}
            type="button"
          >
            Back to course
          </button>
        </div>
      </section>
    );
  }

  const scorePercent = getScorePercent(result.score, result.maxScore);
  const hasAnswers = Boolean(result.answers && result.answers.length > 0);

  return (
    <section className={cn("space-y-6", className)}>
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={cn(
                  "rounded-pill border px-3 py-1 text-xs font-semibold",
                  getAttemptStatusClasses(result.status, result.passed),
                )}
              >
                {result.passed ? "Passed" : formatStatus(result.status)}
              </span>

              <span className="rounded-pill border border-border bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                Attempt #{result.attemptNumber}
              </span>

              <span className="rounded-pill border border-border bg-background px-3 py-1 text-xs font-semibold text-muted-foreground">
                {result.assessmentType === "PROJECT" ? "Project" : "Quiz"}
              </span>
            </div>

            <h1 className="mt-4 text-2xl font-bold leading-tight text-foreground">
              {result.assessmentTitle}
            </h1>

            <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
              View your score, submission details, and review information when
              available.
            </p>
          </div>

          <div className="flex shrink-0 flex-col gap-2 sm:flex-row lg:flex-col">
            {result.canRetake ? (
              <button
                className="inline-flex min-h-10 items-center justify-center rounded-pill border border-primary bg-primary px-5 text-sm font-semibold text-primary-foreground transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={isRetaking}
                onClick={() => void handleRetake()}
                type="button"
              >
                {isRetaking ? "Starting..." : "Retake"}
              </button>
            ) : null}

            <button
              className="inline-flex min-h-10 items-center justify-center rounded-pill border border-border bg-background px-5 text-sm font-semibold transition hover:border-primary hover:text-primary"
              onClick={navigateBackToAssessment}
              type="button"
            >
              Back to assessment
            </button>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <ResultMetaCard
          label="Score"
          value={getScoreLabel(result.score, result.maxScore)}
        />

        <ResultMetaCard
          label="Percentage"
          value={scorePercent === null ? "Not graded" : `${scorePercent}%`}
        />

        <ResultMetaCard
          label="Started"
          value={formatDateTime(result.startedAt)}
        />

        <ResultMetaCard
          label="Submitted"
          value={formatDateTime(result.submittedAt)}
        />
      </div>

      {!result.canReview ? (
        <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
          <p className="text-sm font-semibold text-foreground">
            Review is not available yet
          </p>

          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Your score may be visible, but detailed answers or feedback are not
            available for this assessment yet.
          </p>
        </div>
      ) : null}

      {result.projectSubmission ? (
        <ProjectSubmissionResult submission={result.projectSubmission} />
      ) : null}

      {result.canReview && hasAnswers ? (
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground">
              Answer review
            </h2>

            <p className="mt-1 text-sm text-muted-foreground">
              Check your submitted answers and feedback.
            </p>
          </div>

          {result.answers?.map((answer, index) => (
            <ResultAnswerCard
              answer={answer}
              index={index}
              key={answer.questionId}
            />
          ))}
        </div>
      ) : null}
    </section>
  );
}
