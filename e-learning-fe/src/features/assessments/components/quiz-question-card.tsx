"use client";

import type {
  ActiveAttemptQuestion,
  AssessmentQuestionType,
} from "../types/assessment";

type QuizQuestionCardProps = {
  answer: string;
  disabled?: boolean;
  isSaving?: boolean;
  question: ActiveAttemptQuestion;
  saveError?: string | null;
  onAnswerChange: (answer: string) => void;
  onSave: () => void;
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

export function QuizQuestionCard({
  answer,
  disabled,
  isSaving,
  onAnswerChange,
  onSave,
  question,
  saveError,
}: QuizQuestionCardProps) {
  const questionName = `question-${question.questionId}`;

  return (
    <article className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
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

        {question.type === "PROJECT" ? (
          <p className="rounded-xl border border-border bg-muted p-4 text-sm text-muted-foreground">
            Project questions are submitted through the project submission form.
          </p>
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
