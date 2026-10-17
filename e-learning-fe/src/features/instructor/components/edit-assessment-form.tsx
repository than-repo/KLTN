"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/features/auth/hooks/use-auth";

import {
  getInstructorAssessmentDetail,
  publishInstructorAssessment,
  updateInstructorAssessment,
  updatePublishedInstructorAssessment,
} from "../api/instructor-assessment-api";
import type {
  AssessmentReviewContent,
  AssessmentReviewTiming,
  AssessmentType,
  DetailedAssessment,
} from "../types/instructor-assessment";
import {
  toDatetimeLocalValue,
  toIsoOrNull,
} from "../utils/assessment-datetime";
import { getErrorMessage } from "../utils/instructor-format";
import { InstructorModal } from "./instructor-modal";

const fieldClasses =
  "mt-2 min-h-11 w-full rounded-md border border-border bg-background px-4 text-base outline-none transition focus:border-primary focus:ring-2 focus:ring-primary-focus/20 disabled:bg-muted disabled:text-muted-foreground";

type AssessmentFormPayload = {
  availableFrom?: string;
  availableUntil?: string;
  description?: string;
  isActive?: boolean;
  maxAttempts?: number | null;
  order?: number;
  passingScore?: number | null;
  reviewContent?: AssessmentReviewContent;
  reviewTiming?: AssessmentReviewTiming;
  timeLimitMinutes?: number | null;
  title?: string;
  type?: AssessmentType;
};

const reviewTimingOptions: { label: string; value: AssessmentReviewTiming }[] =
  [
    { label: "Never", value: "NEVER" },
    { label: "After submit", value: "AFTER_SUBMIT" },
    { label: "After graded", value: "AFTER_GRADED" },
    { label: "After assessment closed", value: "AFTER_ASSESSMENT_CLOSED" },
    { label: "Manual", value: "MANUAL" },
  ];

const reviewContentOptions: {
  label: string;
  value: AssessmentReviewContent;
}[] = [
  { label: "Score only", value: "SCORE_ONLY" },
  { label: "Score and answers", value: "SCORE_AND_ANSWERS" },
  { label: "Full review", value: "FULL_REVIEW" },
];

type EditAssessmentFormProps = {
  assessmentId: string;
  courseId: string;
};

export function EditAssessmentForm({
  assessmentId,
  courseId,
}: EditAssessmentFormProps) {
  const router = useRouter();
  const { accessToken, status } = useAuth();

  const [assessment, setAssessment] = useState<DetailedAssessment | null>(null);
  const [form, setForm] = useState<AssessmentFormPayload>({});
  const [initialForm, setInitialForm] = useState<AssessmentFormPayload>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [errorModalMessage, setErrorModalMessage] = useState<string | null>(
    null,
  );
  const [successModal, setSuccessModal] = useState<{
    message: string;
    redirectTo?: string;
  } | null>(null);

  const isPublished = assessment?.status === "PUBLISHED";

  const isDirty = useMemo(
    () => JSON.stringify(form) !== JSON.stringify(initialForm),
    [form, initialForm],
  );

  function showError(message: string) {
    setSuccessModal(null);
    setErrorModalMessage(message);
  }

  function showSuccess(message: string, redirectTo?: string) {
    setErrorModalMessage(null);
    setSuccessModal({ message, redirectTo });
  }

  function closeSuccessModal() {
    const redirectTo = successModal?.redirectTo;

    setSuccessModal(null);

    if (redirectTo) {
      router.push(redirectTo);
    }
  }

  async function loadAssessment(token: string) {
    try {
      const data = await getInstructorAssessmentDetail(
        courseId,
        assessmentId,
        token,
      );

      setErrorModalMessage(null);

      const dataLike = data as DetailedAssessment;

      const nextForm: AssessmentFormPayload = {
        availableFrom: toDatetimeLocalValue(data.availableFrom),
        availableUntil: toDatetimeLocalValue(data.availableUntil),
        description: data.description || "",
        isActive: data.isActive,
        maxAttempts: data.maxAttempts ?? undefined,
        order: data.order,
        passingScore: data.passingScore ?? undefined,
        reviewContent:
          dataLike.reviewContent ??
          dataLike.assessmentReviewContent ??
          "SCORE_ONLY",
        reviewTiming:
          dataLike.reviewTiming ??
          dataLike.assessmentReviewTiming ??
          "AFTER_GRADED",
        timeLimitMinutes: data.timeLimitMinutes ?? undefined,
        title: data.title,
        type: data.type,
      };

      setAssessment(data);
      setForm(nextForm);
      setInitialForm(nextForm);
    } catch (loadError) {
      showError(getErrorMessage(loadError, "Could not load assessment."));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (status !== "authenticated" || !accessToken) {
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect -- loader manages its own async loading state
    void loadAssessment(accessToken);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, assessmentId, courseId, status]);
  function update<K extends keyof AssessmentFormPayload>(
    key: K,
    value: AssessmentFormPayload[K],
  ) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleCancel() {
    if (isDirty) {
      setShowCancelModal(true);
      return;
    }

    router.back();
  }

  function discardChanges() {
    setShowCancelModal(false);
    router.back();
  }

  async function handlePublish() {
    if (!assessment || assessment.status === "PUBLISHED" || !accessToken)
      return;

    try {
      setPublishing(true);
      setErrorModalMessage(null);

      await publishInstructorAssessment(courseId, assessmentId, accessToken);
      await loadAssessment(accessToken);

      showSuccess("Assessment published successfully.");
    } catch (publishError) {
      showError(getErrorMessage(publishError, "Could not publish assessment."));
    } finally {
      setPublishing(false);
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!accessToken) {
      showError("Your session is not ready. Please sign in again.");
      return;
    }

    try {
      setSaving(true);
      setErrorModalMessage(null);

      if (isPublished) {
        const publishedPayload = {
          assessmentReviewContent: form.reviewContent ?? "SCORE_ONLY",
          assessmentReviewTiming: form.reviewTiming ?? "AFTER_GRADED",
          availableFrom: toIsoOrNull(form.availableFrom) ?? undefined,
          availableUntil: toIsoOrNull(form.availableUntil) ?? undefined,
          isActive: form.isActive,
          maxAttempts:
            form.maxAttempts === null || form.maxAttempts === undefined
              ? undefined
              : Number(form.maxAttempts),
          timeLimitMinutes:
            form.type === "QUIZ"
              ? Number(form.timeLimitMinutes || 0) || undefined
              : undefined,
        };

        await updatePublishedInstructorAssessment(
          courseId,
          assessmentId,
          publishedPayload,
          accessToken,
        );

        setInitialForm({ ...form, ...publishedPayload });
      } else {
        const draftPayload = {
          availableFrom: toIsoOrNull(form.availableFrom),
          availableUntil: toIsoOrNull(form.availableUntil),
          description: form.description ?? "",
          isActive: form.isActive,
          maxAttempts:
            form.maxAttempts === null || form.maxAttempts === undefined
              ? undefined
              : Number(form.maxAttempts),
          order: form.order,
          passingScore:
            form.passingScore === null || form.passingScore === undefined
              ? undefined
              : Number(form.passingScore),
          timeLimitMinutes:
            form.type === "QUIZ"
              ? Number(form.timeLimitMinutes || 0) || undefined
              : undefined,
          title: form.title,
          type: form.type,
        };

        await updateInstructorAssessment(
          courseId,
          assessmentId,
          draftPayload,
          accessToken,
        );

        setInitialForm(form);
      }

      showSuccess(
        "Assessment updated successfully.",
        `/instructor/courses/${courseId}/assessments`,
      );
    } catch (saveError) {
      showError(getErrorMessage(saveError, "Could not save assessment."));
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
        <div className="h-6 w-1/3 rounded-md bg-muted" />
        <div className="mt-4 h-64 w-full rounded-md bg-muted" />
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="rounded-lg border border-danger/40 bg-danger/5 p-6 text-sm text-danger">
        Assessment not found.{" "}
        <Link
          className="font-semibold underline"
          href={`/instructor/courses/${courseId}/assessments`}
        >
          Back to assessments
        </Link>
      </div>
    );
  }
  return (
    <div className="grid gap-5">
      <div className="rounded-lg border border-border bg-card p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-xl font-semibold">Edit assessment</h2>
            <Badge variant={isPublished ? "action" : "warning"}>
              {assessment.status || "DRAFT"}
            </Badge>
          </div>

          {!isPublished ? (
            <button
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-success/50 bg-card px-5 text-sm font-semibold text-success transition-colors hover:bg-success/10 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={publishing}
              onClick={handlePublish}
              type="button"
            >
              {publishing ? "Publishing..." : "Publish assessment"}
            </button>
          ) : null}
        </div>

        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {isPublished
            ? "This assessment is published. Only availability, attempts, time limit and review settings can be changed."
            : "Update the assessment details before publishing it."}
        </p>

        <form className="mt-6 grid gap-5" onSubmit={handleSubmit}>
          <div>
            <label className="text-sm font-medium" htmlFor="edit-a-title">
              Title
            </label>
            <input
              className={fieldClasses}
              disabled={isPublished}
              id="edit-a-title"
              onChange={(event) => update("title", event.target.value)}
              required
              value={form.title ?? ""}
            />
          </div>

          <div>
            <label className="text-sm font-medium" htmlFor="edit-a-desc">
              Description
            </label>
            <textarea
              className={fieldClasses}
              disabled={isPublished}
              id="edit-a-desc"
              onChange={(event) => update("description", event.target.value)}
              rows={4}
              value={form.description ?? ""}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium" htmlFor="edit-a-type">
                Type
              </label>
              <select
                className={fieldClasses}
                disabled={isPublished}
                id="edit-a-type"
                onChange={(event) =>
                  update("type", event.target.value as AssessmentType)
                }
                value={form.type ?? "QUIZ"}
              >
                <option value="QUIZ">Quiz</option>
                <option value="PROJECT">Project</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-medium" htmlFor="edit-a-pass">
                Passing score (%)
              </label>
              <input
                className={fieldClasses}
                disabled={isPublished}
                id="edit-a-pass"
                max={100}
                min={0}
                onChange={(event) =>
                  update(
                    "passingScore",
                    event.target.value === ""
                      ? null
                      : Number(event.target.value),
                  )
                }
                type="number"
                value={form.passingScore ?? ""}
              />
            </div>

            <div>
              <label className="text-sm font-medium" htmlFor="edit-a-attempts">
                Max attempts
              </label>
              <input
                className={fieldClasses}
                id="edit-a-attempts"
                max={10}
                min={1}
                onChange={(event) =>
                  update(
                    "maxAttempts",
                    event.target.value === ""
                      ? null
                      : Number(event.target.value),
                  )
                }
                type="number"
                value={form.maxAttempts ?? ""}
              />
            </div>

            {form.type === "QUIZ" ? (
              <div>
                <label className="text-sm font-medium" htmlFor="edit-a-time">
                  Time limit minutes
                </label>
                <input
                  className={fieldClasses}
                  id="edit-a-time"
                  max={60}
                  min={1}
                  onChange={(event) =>
                    update(
                      "timeLimitMinutes",
                      event.target.value === ""
                        ? null
                        : Number(event.target.value),
                    )
                  }
                  type="number"
                  value={form.timeLimitMinutes ?? ""}
                />
              </div>
            ) : null}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="text-sm font-medium" htmlFor="edit-a-from">
                Available from
              </label>
              <input
                className={fieldClasses}
                id="edit-a-from"
                onChange={(event) =>
                  update("availableFrom", event.target.value)
                }
                type="datetime-local"
                value={form.availableFrom ?? ""}
              />
            </div>

            <div>
              <label className="text-sm font-medium" htmlFor="edit-a-until">
                Available until
              </label>
              <input
                className={fieldClasses}
                id="edit-a-until"
                onChange={(event) =>
                  update("availableUntil", event.target.value)
                }
                type="datetime-local"
                value={form.availableUntil ?? ""}
              />
            </div>
          </div>

          {isPublished ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label
                  className="text-sm font-medium"
                  htmlFor="edit-a-review-timing"
                >
                  Review timing
                </label>
                <select
                  className={fieldClasses}
                  id="edit-a-review-timing"
                  onChange={(event) =>
                    update(
                      "reviewTiming",
                      event.target.value as AssessmentReviewTiming,
                    )
                  }
                  value={form.reviewTiming ?? "AFTER_GRADED"}
                >
                  {reviewTimingOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  className="text-sm font-medium"
                  htmlFor="edit-a-review-content"
                >
                  Review content
                </label>
                <select
                  className={fieldClasses}
                  id="edit-a-review-content"
                  onChange={(event) =>
                    update(
                      "reviewContent",
                      event.target.value as AssessmentReviewContent,
                    )
                  }
                  value={form.reviewContent ?? "SCORE_ONLY"}
                >
                  {reviewContentOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : null}

          <label className="flex items-center gap-2 text-sm">
            <input
              checked={form.isActive ?? true}
              onChange={(event) => update("isActive", event.target.checked)}
              type="checkbox"
            />
            Active (visible to learners)
          </label>

          <div className="flex justify-end gap-2 border-t border-border pt-5">
            <button
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-card px-6 text-base font-semibold transition-colors hover:bg-muted"
              onClick={handleCancel}
              type="button"
            >
              Cancel
            </button>
            <button
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-primary bg-primary px-6 text-base font-semibold text-primary-foreground transition-colors hover:bg-primary-focus disabled:cursor-not-allowed disabled:opacity-60"
              disabled={saving}
              type="submit"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
      <InstructorModal
        onClose={() => setShowCancelModal(false)}
        open={showCancelModal}
        title="Discard changes?"
      >
        <p>
          You have unsaved changes. If you leave this page now, they will be
          lost.
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-card px-5 text-sm font-semibold"
            onClick={() => setShowCancelModal(false)}
            type="button"
          >
            Keep editing
          </button>
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-danger bg-danger px-5 text-sm font-semibold text-danger-foreground"
            onClick={discardChanges}
            type="button"
          >
            Discard
          </button>
        </div>
      </InstructorModal>

      <InstructorModal
        onClose={() => setErrorModalMessage(null)}
        open={errorModalMessage !== null}
        title="Something went wrong"
      >
        <p className="whitespace-pre-wrap text-danger">{errorModalMessage}</p>
      </InstructorModal>

      <InstructorModal
        onClose={closeSuccessModal}
        open={successModal !== null}
        title="Success"
      >
        <p className="whitespace-pre-wrap text-success">
          {successModal?.message}
        </p>
      </InstructorModal>
    </div>
  );
}
