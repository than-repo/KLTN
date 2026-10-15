"use client";

import { useState } from "react";

import type { ActiveAttempt, SubmitProjectInput } from "../types/assessment";

type ProjectSubmissionFormProps = {
  activeAttempt: ActiveAttempt;
  disabled?: boolean;
  isSubmitting?: boolean;
  onSubmit: (input: SubmitProjectInput) => Promise<void>;
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

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function ProjectSubmissionForm({
  activeAttempt,
  disabled = false,
  isSubmitting = false,
  onSubmit,
}: ProjectSubmissionFormProps) {
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
    const githubUrl = form.githubUrl?.trim();
    const deployUrl = form.deployUrl?.trim();
    const documentUrl = form.documentUrl?.trim();
    const note = form.note?.trim();

    if (!githubUrl || !deployUrl || !documentUrl) {
      setError("Please provide GitHub URL, Deploy URL, and Document URL.");
      return;
    }

    try {
      await onSubmit({
        deployUrl,
        documentUrl,
        githubUrl,
        note: note || undefined,
      });
    } catch (error) {
      setError(getErrorMessage(error, "Unable to submit project."));
    }
  }

  return (
    <article className="rounded-2xl border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <span className="rounded-pill border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-semibold text-primary">
            Project submission
          </span>

          <h3 className="mt-4 break-words text-xl font-semibold text-foreground">
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
            value={form.githubUrl ?? ""}
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
            value={form.deployUrl ?? ""}
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
            value={form.documentUrl ?? ""}
          />
        </label>

        <label className="block">
          <span className="text-sm font-semibold">Note</span>

          <textarea
            className="mt-2 min-h-32 w-full rounded-xl border border-border bg-background px-4 py-3 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/15 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={disabled || isSubmitting}
            onChange={(event) => updateField("note", event.target.value)}
            placeholder="Tell your instructor what to review..."
            value={form.note ?? ""}
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
