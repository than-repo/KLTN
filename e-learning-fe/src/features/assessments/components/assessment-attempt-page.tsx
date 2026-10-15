"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { useAssessmentAttempt } from "../hooks/use-assessment-attempt";

import type {
  ActiveAttempt,
  ActiveAttemptQuestion,
  AssessmentQuestionType,
  SubmitProjectInput,
} from "../types/assessment";

type AssessmentAttemptPageProps = {
  accessToken: string;
  courseId: string;
  assessmentId: string;
  attemptId: string;
  courseSlug: string;
  className?: string;
};

type ProjectFormState = SubmitProjectInput;

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

function formatDuration(seconds?: number | null) {
  if (seconds === undefined || seconds === null) {
    return "No time limit";
  }

  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(
    remainingSeconds,
  ).padStart(2, "0")}`;
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

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function AttemptPageSkeleton() {
  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="animate-pulse space-y-6">
        <div className="h-5 w-28 rounded bg-muted" />

        <div className="space-y-3">
          <div className="h-8 w-2/3 rounded bg-muted" />
          <div className="h-4 w-full rounded bg-muted" />
          <div className="h-4 w-4/5 rounded bg-muted" />
        </div>

        <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
          <div className="space-y-4">
            <div className="h-52 rounded-2xl bg-muted" />
            <div className="h-52 rounded-2xl bg-muted" />
          </div>

          <div className="h-72 rounded-2xl bg-muted" />
        </div>
      </div>
    </section>
  );
}

function AttemptMeta({
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

      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function QuestionOption({
  checked,
  disabled,
  label,
  name,
  onChange,
  value,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  name: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label
      className={cn(
        "flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-background p-4 text-sm transition",
        checked && "border-primary bg-primary/5",
        disabled && "cursor-not-allowed opacity-70",
      )}
    >
      <input
        checked={checked}
        className="mt-1 h-4 w-4 accent-current"
        disabled={disabled}
        name={name}
        onChange={() => onChange(value)}
        type="radio"
        value={value}
      />

      <span className="whitespace-pre-line break-words leading-6 text-foreground">
        {label}
      </span>
    </label>
  );
}

function QuizQuestionCard({
  answer,
  disabled,
  isSaving,
  onAnswerChange,
  onSave,
  question,
  saveError,
}: {
  answer: string;
  disabled?: boolean;
  isSaving?: boolean;
  onAnswerChange: (answer: string) => void;
  onSave: () => void;
  question: ActiveAttemptQuestion;
  saveError?: string | null;
}) {
  const questionName = `question-${question.questionId}`;

  return (
    <article className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-pill border border-border bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
              Question {question.order + 1}
            </span>

            <span className="rounded-pill border border-border bg-background px-3 py-1 text-xs font-semibold text-muted-foreground">
              {formatQuestionType(question.type)}
            </span>
          </div>

          <div className="mt-4 text-lg font-semibold leading-7 text-foreground">
            <TextContent>{question.questionText}</TextContent>
          </div>
        </div>

        <span className="shrink-0 rounded-pill border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
          {question.points} {question.points === 1 ? "point" : "points"}
        </span>
      </div>

      <div className="mt-5 space-y-3">
        {question.type === "MULTIPLE_CHOICE" ? (
          question.options && question.options.length > 0 ? (
            question.options.map((option) => (
              <QuestionOption
                checked={answer === option}
                disabled={disabled}
                key={option}
                label={option}
                name={questionName}
                onChange={onAnswerChange}
                value={option}
              />
            ))
          ) : (
            <p className="rounded-xl border border-danger/20 bg-danger/5 p-4 text-sm text-danger">
              This question has no options configured.
            </p>
          )
        ) : null}

        {question.type === "TRUE_FALSE" ? (
          <>
            <QuestionOption
              checked={answer === "TRUE"}
              disabled={disabled}
              label="True"
              name={questionName}
              onChange={onAnswerChange}
              value="TRUE"
            />

            <QuestionOption
              checked={answer === "FALSE"}
              disabled={disabled}
              label="False"
              name={questionName}
              onChange={onAnswerChange}
              value="FALSE"
            />
          </>
        ) : null}

        {question.type === "FILL_IN_THE_BLANK" ? (
          <textarea
            className="min-h-28 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={disabled}
            onChange={(event) => onAnswerChange(event.target.value)}
            placeholder="Type your answer..."
            value={answer}
          />
        ) : null}
      </div>

      {saveError ? (
        <p className="mt-4 rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
          {saveError}
        </p>
      ) : null}

      <div className="mt-5 flex justify-end">
        <button
          className="inline-flex min-h-10 items-center justify-center rounded-pill border border-border bg-background px-4 text-sm font-semibold transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-60"
          disabled={disabled || isSaving}
          onClick={onSave}
          type="button"
        >
          {isSaving ? "Saving..." : "Save answer"}
        </button>
      </div>
    </article>
  );
}
function ProjectSubmissionPanel({
  activeAttempt,
  disabled,
  isSubmitting,
  onSubmit,
}: {
  activeAttempt: ActiveAttempt;
  disabled?: boolean;
  isSubmitting?: boolean;
  onSubmit: (input: SubmitProjectInput) => Promise<void>;
}) {
  const [form, setForm] = useState<ProjectFormState>({
    deployUrl: "",
    documentUrl: "",
    githubUrl: "",
    note: "",
  });

  const [error, setError] = useState<string | null>(null);

  function updateField<Key extends keyof ProjectFormState>(
    key: Key,
    value: ProjectFormState[Key],
  ) {
    setForm((currentForm) => ({
      ...currentForm,
      [key]: value,
    }));

    setError(null);
  }

  async function handleSubmit() {
    const hasAnySubmissionLink = Boolean(
      form.githubUrl?.trim() ||
      form.deployUrl?.trim() ||
      form.documentUrl?.trim(),
    );

    if (!hasAnySubmissionLink) {
      setError("Please provide at least one project link or document URL.");
      return;
    }

    try {
      await onSubmit({
        deployUrl: form.deployUrl?.trim() || undefined,
        documentUrl: form.documentUrl?.trim() || undefined,
        githubUrl: form.githubUrl?.trim() || undefined,
        note: form.note?.trim() || undefined,
      });
    } catch (error) {
      setError(getErrorMessage(error, "Unable to submit project."));
    }
  }

  return (
    <article className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <span className="rounded-pill border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
            Project submission
          </span>

          <h3 className="mt-4 text-xl font-semibold text-foreground">
            {activeAttempt.projectRequirement?.title ??
              activeAttempt.assessmentTitle}
          </h3>

          <TextContent className="mt-2 text-sm leading-6 text-muted-foreground">
            {activeAttempt.projectRequirement?.description ??
              activeAttempt.assessmentDescription ??
              "Submit your project links for instructor review."}
          </TextContent>
        </div>

        <span className="shrink-0 rounded-pill border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
          {activeAttempt.totalPoints} points
        </span>
      </div>

      {activeAttempt.projectRequirement?.requirement ? (
        <div className="mt-5 rounded-xl border border-border bg-background p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Requirement
          </p>

          <TextContent className="mt-2 text-sm leading-6 text-foreground">
            {activeAttempt.projectRequirement.requirement}
          </TextContent>
        </div>
      ) : null}

      <div className="mt-6 space-y-4">
        <label className="block">
          <span className="text-sm font-semibold">GitHub URL</span>

          <input
            className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={disabled || isSubmitting}
            onChange={(event) => updateField("githubUrl", event.target.value)}
            placeholder="https://github.com/your-name/project"
            type="url"
            value={form.githubUrl}
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold">Deploy URL</span>

          <input
            className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={disabled || isSubmitting}
            onChange={(event) => updateField("deployUrl", event.target.value)}
            placeholder="https://your-project.vercel.app"
            type="url"
            value={form.deployUrl}
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold">Document URL</span>

          <input
            className="mt-2 h-11 w-full rounded-xl border border-border bg-background px-4 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={disabled || isSubmitting}
            onChange={(event) => updateField("documentUrl", event.target.value)}
            placeholder="https://drive.google.com/..."
            type="url"
            value={form.documentUrl}
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold">Note</span>

          <textarea
            className="mt-2 min-h-32 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={disabled || isSubmitting}
            onChange={(event) => updateField("note", event.target.value)}
            placeholder="Tell your instructor what to review..."
            value={form.note}
          />
        </label>
      </div>

      {error ? (
        <p className="mt-5 rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <div className="mt-6 flex justify-end">
        <button
          className="inline-flex min-h-11 items-center justify-center rounded-pill border border-primary bg-primary px-6 text-sm font-semibold text-primary-foreground transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={disabled || isSubmitting}
          onClick={() => void handleSubmit()}
          type="button"
        >
          {isSubmitting ? "Submitting..." : "Submit project"}
        </button>
      </div>
    </article>
  );
}

function AttemptSidebar({
  activeAttempt,
  answeredCount,
  isSaving,
  isSubmitting,

  onSubmit,
  remainingSeconds,
  totalQuestions,
}: {
  activeAttempt: ActiveAttempt;
  answeredCount: number;
  isSaving: boolean;
  isSubmitting: boolean;

  onSubmit: () => Promise<void>;
  remainingSeconds: number | null;
  totalQuestions: number;
}) {
  const isQuiz = activeAttempt.type === "QUIZ";
  const isTimeLow = remainingSeconds !== null && remainingSeconds <= 300;

  return (
    <aside className="rounded-2xl border border-border bg-card p-5 shadow-sm lg:sticky lg:top-24">
      <h3 className="text-base font-semibold">Attempt summary</h3>

      <div className="mt-4 space-y-3">
        <AttemptMeta
          label="Attempt"
          value={`#${activeAttempt.attemptNumber}`}
        />

        <AttemptMeta
          label="Started"
          value={formatDateTime(activeAttempt.startedAt)}
        />

        <div
          className={cn(
            "rounded-xl border p-4",
            isTimeLow
              ? "border-danger/20 bg-danger/5"
              : "border-border bg-background",
          )}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Time remaining
          </p>

          <p
            className={cn(
              "mt-1 text-lg font-bold",
              isTimeLow ? "text-danger" : "text-foreground",
            )}
          >
            {formatDuration(remainingSeconds)}
          </p>
        </div>

        {isQuiz ? (
          <AttemptMeta
            label="Answered"
            value={`${answeredCount} / ${totalQuestions}`}
          />
        ) : null}

        <AttemptMeta label="Total points" value={activeAttempt.totalPoints} />

        {activeAttempt.passingScore !== null &&
        activeAttempt.passingScore !== undefined ? (
          <AttemptMeta
            label="Passing score (%)"
            value={activeAttempt.passingScore}
          />
        ) : null}
      </div>

      {isQuiz ? (
        <div className="mt-5 space-y-3">
          <button
            className="inline-flex min-h-11 w-full items-center justify-center rounded-pill border border-primary bg-primary px-5 text-sm font-semibold text-primary-foreground transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSaving || isSubmitting}
            onClick={() => void onSubmit()}
            type="button"
          >
            {isSubmitting ? "Submitting..." : "Submit attempt"}
          </button>
        </div>
      ) : null}

      <p className="mt-4 text-xs leading-5 text-muted-foreground">
        Make sure your answers are saved before submitting. Submitted attempts
        cannot be edited.
      </p>
    </aside>
  );
}
export function AssessmentAttemptPage({
  accessToken,
  assessmentId,
  attemptId,
  className,
  courseId,
  courseSlug,
}: AssessmentAttemptPageProps) {
  const router = useRouter();

  const {
    activeAttempt,
    answeredCount,
    answers,
    error,
    isLoading,
    isSaving,
    isSubmitting,
    isSubmittingProject,
    loadAttempt,
    saveAnswer,
    saveErrors,
    savingQuestionIds,
    setAnswer,
    submit,
    submitProject,
    totalQuestions,
  } = useAssessmentAttempt({
    accessToken,
    assessmentId,
    attemptId,
    courseId,
  });

  const ANSWER_AUTOSAVE_DELAY_MS = 600;
  const TIMER_FINALIZE_THRESHOLD_SECONDS = 5;

  const [isFinalizingByTimer, setIsFinalizingByTimer] = useState(false);

  const [pageError, setPageError] = useState<string | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const autoSubmittedRef = useRef(false);

  const answersRef = useRef<Record<string, string>>({});
  const activeAttemptRef = useRef<ActiveAttempt | null>(null);
  const autosaveTimeoutsRef = useRef<Record<string, number>>({});

  const isQuiz = activeAttempt?.type === "QUIZ";
  const isProject = activeAttempt?.type === "PROJECT";

  const sortedQuestions = useMemo(() => {
    return [...(activeAttempt?.questions ?? [])].sort(
      (firstQuestion, secondQuestion) =>
        firstQuestion.order - secondQuestion.order,
    );
  }, [activeAttempt]);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    activeAttemptRef.current = activeAttempt;
  }, [activeAttempt]);

  useEffect(() => {
    return () => {
      Object.values(autosaveTimeoutsRef.current).forEach((timeoutId) => {
        window.clearTimeout(timeoutId);
      });
    };
  }, []);

  function navigateToResult(targetAttemptId = attemptId) {
    router.push(
      `/courses/${courseSlug}/learn/assessments/${assessmentId}/attempts/${targetAttemptId}/result`,
    );
  }

  function navigateBackToAssessment() {
    router.push(
      `/courses/${courseSlug}/learn?assessment=${encodeURIComponent(
        assessmentId,
      )}`,
    );
  }

  function scheduleAutosaveAnswer(questionId: string, answer: string) {
    if (autosaveTimeoutsRef.current[questionId]) {
      window.clearTimeout(autosaveTimeoutsRef.current[questionId]);
    }

    autosaveTimeoutsRef.current[questionId] = window.setTimeout(() => {
      if (!answer.trim()) {
        return;
      }

      void saveAnswer(questionId, answer);
    }, ANSWER_AUTOSAVE_DELAY_MS);
  }

  function handleAnswerChange(questionId: string, answer: string) {
    answersRef.current = {
      ...answersRef.current,
      [questionId]: answer,
    };

    setAnswer(questionId, answer);
    scheduleAutosaveAnswer(questionId, answer);
  }

  async function flushAutosaves() {
    Object.values(autosaveTimeoutsRef.current).forEach((timeoutId) => {
      window.clearTimeout(timeoutId);
    });

    autosaveTimeoutsRef.current = {};
  }

  async function handleSaveAll(options?: {
    requireAnswered?: boolean;
    showError?: boolean;
  }) {
    const currentAttempt = activeAttemptRef.current;

    if (!currentAttempt) {
      return false;
    }

    const requireAnswered = options?.requireAnswered ?? true;
    const showError = options?.showError ?? true;
    const latestAnswers = answersRef.current;

    if (showError) {
      setPageError(null);
    }

    await flushAutosaves();

    const answeredQuestions = currentAttempt.questions.filter((question) =>
      latestAnswers[question.questionId]?.trim(),
    );

    if (requireAnswered && answeredQuestions.length === 0) {
      if (showError) {
        setPageError("Please answer at least one question before saving.");
      }

      return false;
    }

    const saveResults = await Promise.all(
      answeredQuestions.map((question) =>
        saveAnswer(question.questionId, latestAnswers[question.questionId]),
      ),
    );

    const hasFailedSave = saveResults.some((result) => result === null);

    if (hasFailedSave) {
      if (showError) {
        setPageError(
          "Some answers could not be saved. Please check your connection and try again.",
        );
      }

      return false;
    }

    return true;
  }

  async function handleSubmit(options?: {
    skipConfirm?: boolean;
    triggeredByTimer?: boolean;
  }) {
    if (!activeAttempt) {
      return;
    }

    setPageError(null);

    const unansweredCount = activeAttempt.questions.filter(
      (question) => !answers[question.questionId]?.trim(),
    ).length;

    if (unansweredCount > 0 && !options?.skipConfirm) {
      const shouldSubmit = window.confirm(
        `You still have ${unansweredCount} unanswered ${
          unansweredCount === 1 ? "question" : "questions"
        }. Submit anyway?`,
      );

      if (!shouldSubmit) {
        return;
      }
    }

    if (options?.triggeredByTimer) {
      setIsFinalizingByTimer(true);
    }

    try {
      const didSaveAnswers = await handleSaveAll({
        requireAnswered: false,
        showError: !options?.triggeredByTimer,
      });

      if (!didSaveAnswers) {
        setPageError(
          options?.triggeredByTimer
            ? "Saving your answers and submitting your quiz..."
            : "Some answers could not be saved. Please try again.",
        );

        return;
      }

      const result = await submit();

      navigateToResult(result.attemptId);
    } catch (error) {
      setPageError(getErrorMessage(error, "Unable to submit attempt."));
    } finally {
      if (options?.triggeredByTimer) {
        setIsFinalizingByTimer(false);
      }
    }
  }

  async function handleProjectSubmit(input: SubmitProjectInput) {
    if (!activeAttempt) {
      return;
    }

    setPageError(null);

    try {
      const currentAttemptId = activeAttempt.attemptId;

      await submitProject(input);

      navigateToResult(currentAttemptId);
    } catch (error) {
      setPageError(getErrorMessage(error, "Unable to submit project."));
      throw error;
    }
  }

  useEffect(() => {
    if (!activeAttempt) {
      setRemainingSeconds(null);
      return;
    }

    setRemainingSeconds(activeAttempt.remainingSeconds ?? null);
    autoSubmittedRef.current = false;
  }, [activeAttempt]);

  useEffect(() => {
    if (remainingSeconds === null || remainingSeconds <= 0) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setRemainingSeconds((currentSeconds) => {
        if (currentSeconds === null) {
          return null;
        }

        return Math.max(0, currentSeconds - 1);
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [remainingSeconds]);

  async function finalizeAttemptByTimer() {
    if (!activeAttemptRef.current || autoSubmittedRef.current) {
      return;
    }

    autoSubmittedRef.current = true;
    setIsFinalizingByTimer(true);
    setPageError(null);

    try {
      const didSaveAnswers = await handleSaveAll({
        requireAnswered: false,
        showError: false,
      });

      if (!didSaveAnswers) {
        setPageError(
          "Time is almost up. Some answers could not be saved before submission.",
        );
        return;
      }

      const result = await submit();

      navigateToResult(result.attemptId);
    } catch (error) {
      setPageError(getErrorMessage(error, "Unable to submit attempt."));
    } finally {
      setIsFinalizingByTimer(false);
    }
  }

  useEffect(() => {
    if (
      remainingSeconds === null ||
      remainingSeconds > TIMER_FINALIZE_THRESHOLD_SECONDS ||
      !activeAttempt ||
      activeAttempt.type !== "QUIZ" ||
      autoSubmittedRef.current ||
      isSubmitting ||
      isFinalizingByTimer
    ) {
      return;
    }

    void finalizeAttemptByTimer();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remainingSeconds, activeAttempt, isSubmitting, isFinalizingByTimer]);

  if (isLoading) {
    return <AttemptPageSkeleton />;
  }

  if (error || !activeAttempt) {
    return (
      <section
        className={cn(
          "rounded-2xl border border-danger/20 bg-danger/5 p-6",
          className,
        )}
      >
        <p className="text-sm font-semibold text-danger">
          Unable to load attempt
        </p>

        <p className="mt-2 text-sm text-muted-foreground">
          {error ?? "Attempt data is unavailable."}
        </p>

        <div className="mt-5 flex flex-wrap gap-3">
          <button
            className="inline-flex min-h-10 items-center justify-center rounded-pill border border-danger/30 bg-background px-4 text-sm font-semibold text-danger transition hover:bg-danger/10"
            onClick={() => void loadAttempt(attemptId)}
            type="button"
          >
            Try again
          </button>

          <button
            className="inline-flex min-h-10 items-center justify-center rounded-pill border border-border bg-background px-4 text-sm font-semibold transition hover:border-primary hover:text-primary"
            onClick={navigateBackToAssessment}
            type="button"
          >
            Back to assessment
          </button>
        </div>
      </section>
    );
  }

  const isLocked =
    activeAttempt.status !== "IN_PROGRESS" ||
    isSubmitting ||
    isSubmittingProject ||
    isFinalizingByTimer ||
    remainingSeconds === 0;

  return (
    <section className={cn("space-y-6", className)}>
      <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-pill border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
                {activeAttempt.type === "PROJECT" ? "Project" : "Quiz"}
              </span>

              <span className="rounded-pill border border-border bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
                Attempt #{activeAttempt.attemptNumber}
              </span>
            </div>

            <h1 className="mt-4 text-2xl font-bold leading-tight text-foreground">
              {activeAttempt.assessmentTitle}
            </h1>

            <TextContent className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">
              {activeAttempt.assessmentDescription}
            </TextContent>
          </div>

          <button
            className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-pill border border-border bg-background px-4 text-sm font-semibold transition hover:border-primary hover:text-primary"
            onClick={navigateBackToAssessment}
            type="button"
          >
            Back to assessment
          </button>
        </div>

        {pageError ? (
          <p className="mt-5 rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
            {pageError}
          </p>
        ) : null}

        {isFinalizingByTimer ? (
          <p className="mt-5 rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
            Time is up. Saving your answers and submitting your quiz...
          </p>
        ) : remainingSeconds === 0 ? (
          <p className="mt-5 rounded-xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm text-danger">
            Time is up. Your quiz is being finalized.
          </p>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          {isQuiz ? (
            sortedQuestions.length > 0 ? (
              sortedQuestions.map((question) => (
                <QuizQuestionCard
                  answer={answers[question.questionId] ?? ""}
                  disabled={isLocked}
                  isSaving={savingQuestionIds[question.questionId]}
                  key={question.questionId}
                  onAnswerChange={(answer) =>
                    handleAnswerChange(question.questionId, answer)
                  }
                  onSave={() =>
                    void saveAnswer(
                      question.questionId,
                      answers[question.questionId],
                    )
                  }
                  question={question}
                  saveError={saveErrors[question.questionId]}
                />
              ))
            ) : (
              <div className="rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">
                This quiz does not have any questions yet.
              </div>
            )
          ) : null}

          {isProject ? (
            <ProjectSubmissionPanel
              activeAttempt={activeAttempt}
              disabled={isLocked}
              isSubmitting={isSubmittingProject}
              onSubmit={handleProjectSubmit}
            />
          ) : null}
        </div>

        <AttemptSidebar
          activeAttempt={activeAttempt}
          answeredCount={answeredCount}
          isSaving={isSaving}
          isSubmitting={isSubmitting}
          onSubmit={() => handleSubmit()}
          remainingSeconds={remainingSeconds}
          totalQuestions={totalQuestions}
        />
      </div>
    </section>
  );
}
