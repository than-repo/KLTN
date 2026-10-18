"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/features/auth/hooks/use-auth";

import {
  deleteInstructorAssessment,
  getInstructorAssessments,
  publishInstructorAssessment,
} from "../api/instructor-assessment-api";
import type {
  Assessment,
  PaginatedAssessmentResponse,
} from "../types/instructor-assessment";
import { getErrorMessage } from "../utils/instructor-format";
import { InstructorModal } from "./instructor-modal";

type InstructorAssessmentsContentProps = {
  courseId: string;
};

export function InstructorAssessmentsContent({
  courseId,
}: InstructorAssessmentsContentProps) {
  const { accessToken, status } = useAuth();

  const [data, setData] =
    useState<PaginatedAssessmentResponse<Assessment> | null>(null);
  const [type, setType] = useState("");
  const [assessmentStatus, setAssessmentStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [filtering, setFiltering] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const [assessmentToDelete, setAssessmentToDelete] =
    useState<Assessment | null>(null);
  const [assessmentToPublish, setAssessmentToPublish] =
    useState<Assessment | null>(null);
  const [message, setMessage] = useState<{
    text: string;
    variant: "error" | "success";
  } | null>(null);

  const assessments = useMemo(() => data?.data ?? [], [data]);

  function showError(text: string) {
    setMessage({ text, variant: "error" });
  }

  function showSuccess(text: string) {
    setMessage({ text, variant: "success" });
  }

  async function loadAssessments(options?: {
    nextStatus?: string;
    nextType?: string;
  }) {
    if (!accessToken) return;

    try {
      const requestParams: Record<string, string | number> = {
        limit: 20,
        page: 1,
      };

      const selectedType = options?.nextType ?? type;
      const selectedStatus = options?.nextStatus ?? assessmentStatus;

      if (selectedType) requestParams.type = selectedType;
      if (selectedStatus) requestParams.status = selectedStatus;

      const result = await getInstructorAssessments(
        courseId,
        requestParams,
        accessToken,
      );

      setData(result);
    } catch (loadError) {
      showError(getErrorMessage(loadError, "Could not load assessments."));
    } finally {
      setLoading(false);
      setFiltering(false);
    }
  }

  useEffect(() => {
    if (status !== "authenticated" || !accessToken) {
      return;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect -- loader manages its own async loading state
    void loadAssessments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, courseId, status]);

  async function handleTypeChange(value: string) {
    setType(value);
    setFiltering(true);
    await loadAssessments({ nextType: value });
  }

  async function handleStatusChange(value: string) {
    setAssessmentStatus(value);
    setFiltering(true);
    await loadAssessments({ nextStatus: value });
  }

  async function confirmDeleteAssessment() {
    if (!assessmentToDelete || !accessToken) return;

    try {
      setDeleting(true);

      await deleteInstructorAssessment(
        courseId,
        assessmentToDelete.id,
        accessToken,
      );

      setAssessmentToDelete(null);
      await loadAssessments();
      showSuccess("Assessment deleted successfully.");
    } catch (deleteError) {
      showError(getErrorMessage(deleteError, "Could not delete assessment."));
    } finally {
      setDeleting(false);
    }
  }

  async function confirmPublishAssessment() {
    if (!assessmentToPublish || !accessToken) return;

    try {
      setPublishing(true);

      await publishInstructorAssessment(
        courseId,
        assessmentToPublish.id,
        accessToken,
      );

      setAssessmentToPublish(null);
      await loadAssessments();
      showSuccess("Assessment published successfully.");
    } catch (publishError) {
      showError(getErrorMessage(publishError, "Could not publish assessment."));
    } finally {
      setPublishing(false);
    }
  }
  return (
    <div className="grid gap-5">
      <div className="flex flex-col gap-4 rounded-lg border border-border bg-card p-6 shadow-sm sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium">Filters</p>
          <p className="text-xs text-muted-foreground">
            Use these only when this course has many assessments.
          </p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <select
              className="min-h-10 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary disabled:opacity-50"
              disabled={filtering}
              onChange={(event) => handleTypeChange(event.target.value)}
              value={type}
            >
              <option value="">All types</option>
              <option value="QUIZ">Quiz</option>
              <option value="PROJECT">Project</option>
            </select>
            <select
              className="min-h-10 rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary disabled:opacity-50"
              disabled={filtering}
              onChange={(event) => handleStatusChange(event.target.value)}
              value={assessmentStatus}
            >
              <option value="">All statuses</option>
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
        </div>

        <Link
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-primary bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-focus"
          href={`/instructor/courses/${courseId}/assessments/new`}
        >
          New assessment
        </Link>
      </div>

      {message ? (
        <p
          className={`rounded-md px-4 py-3 text-sm leading-6 ${
            message.variant === "success"
              ? "border border-success/30 bg-success/10 text-success"
              : "border border-danger/30 bg-danger/10 text-danger"
          }`}
          role={message.variant === "success" ? "status" : "alert"}
        >
          {message.text}
        </p>
      ) : null}

      {filtering ? (
        <p className="text-sm text-muted-foreground">Updating assessments...</p>
      ) : null}

      {loading ? (
        <div className="grid gap-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              className="h-32 rounded-lg border border-border bg-card"
              key={index}
            />
          ))}
        </div>
      ) : assessments.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-5 py-14 text-center">
          <p className="text-lg font-semibold">No assessments found</p>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-muted-foreground">
            Create a quiz or project assessment for this course.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {assessments.map((assessment) => {
            const isPublished = assessment.status === "PUBLISHED";
            const isQuiz = assessment.type === "QUIZ";

            return (
              <article
                className="rounded-lg border border-border bg-card p-5 shadow-sm"
                key={assessment.id}
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="grid gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold">
                        {assessment.title}
                      </h2>
                      <Badge>{assessment.type}</Badge>
                      <Badge
                        variant={
                          isPublished
                            ? "action"
                            : assessment.status === "ARCHIVED"
                              ? "neutral"
                              : "warning"
                        }
                      >
                        {assessment.status || "DRAFT"}
                      </Badge>
                      {!assessment.isActive ? (
                        <Badge variant="danger">Inactive</Badge>
                      ) : null}
                    </div>

                    <p className="line-clamp-2 text-sm text-muted-foreground">
                      {assessment.description || "No description"}
                    </p>

                    <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                      <span>Total points: {assessment.totalPoints ?? 0}</span>
                      <span>
                        Passing:{" "}
                        {assessment.passingScore !== null &&
                        assessment.passingScore !== undefined
                          ? `${assessment.passingScore}%`
                          : "None"}
                      </span>
                      <span>
                        Max attempts: {assessment.maxAttempts ?? "Unlimited"}
                      </span>
                      <span>
                        Time limit:{" "}
                        {assessment.timeLimitMinutes
                          ? `${assessment.timeLimitMinutes} min`
                          : "None"}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Link
                      className="inline-flex min-h-9 items-center justify-center rounded-md border border-border bg-surface-pearl px-4 text-sm font-semibold transition-colors hover:border-primary hover:text-primary"
                      href={`/instructor/courses/${courseId}/assessments/${assessment.id}/edit`}
                    >
                      Edit
                    </Link>

                    {isQuiz ? (
                      <Link
                        className="inline-flex min-h-9 items-center justify-center rounded-md border border-border bg-surface-pearl px-4 text-sm font-semibold transition-colors hover:border-primary hover:text-primary"
                        href={`/instructor/courses/${courseId}/assessments/${assessment.id}/questions`}
                      >
                        Questions
                      </Link>
                    ) : null}

                    {!isPublished ? (
                      <button
                        className="inline-flex min-h-9 items-center justify-center rounded-md border border-success/40 bg-card px-4 text-sm font-semibold text-success transition-colors hover:bg-success/10"
                        onClick={() => setAssessmentToPublish(assessment)}
                        type="button"
                      >
                        Publish
                      </button>
                    ) : null}

                    <button
                      className="inline-flex min-h-9 items-center justify-center rounded-md border border-danger/40 bg-card px-4 text-sm font-semibold text-danger transition-colors hover:bg-danger/10"
                      onClick={() => setAssessmentToDelete(assessment)}
                      type="button"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
      <InstructorModal
        onClose={() => setAssessmentToPublish(null)}
        open={assessmentToPublish !== null}
        title="Publish assessment?"
      >
        <p>
          Once published, learners may be able to access this assessment based
          on its availability settings. Some content fields may become
          restricted from editing.
        </p>
        {assessmentToPublish ? (
          <div className="mt-4 rounded-md border border-border bg-surface-pearl p-3 text-sm">
            <p className="font-medium text-foreground">
              {assessmentToPublish.title}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Type: {assessmentToPublish.type} · Points:{" "}
              {assessmentToPublish.totalPoints ?? 0}
            </p>
          </div>
        ) : null}
        <div className="mt-5 flex justify-end gap-2">
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-card px-5 text-sm font-semibold disabled:opacity-50"
            disabled={publishing}
            onClick={() => setAssessmentToPublish(null)}
            type="button"
          >
            Cancel
          </button>
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-primary bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
            disabled={publishing}
            onClick={confirmPublishAssessment}
            type="button"
          >
            {publishing ? "Publishing..." : "Publish"}
          </button>
        </div>
      </InstructorModal>

      <InstructorModal
        onClose={() => setAssessmentToDelete(null)}
        open={assessmentToDelete !== null}
        title="Delete assessment?"
      >
        <p>
          This assessment will be deleted from the course. This action cannot be
          undone.
        </p>
        {assessmentToDelete ? (
          <div className="mt-4 rounded-md border border-border bg-surface-pearl p-3 text-sm">
            <p className="font-medium text-foreground">
              {assessmentToDelete.title}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Status: {assessmentToDelete.status || "DRAFT"} · Type:{" "}
              {assessmentToDelete.type}
            </p>
          </div>
        ) : null}
        <div className="mt-5 flex justify-end gap-2">
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-border bg-card px-5 text-sm font-semibold disabled:opacity-50"
            disabled={deleting}
            onClick={() => setAssessmentToDelete(null)}
            type="button"
          >
            Cancel
          </button>
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-danger bg-danger px-5 text-sm font-semibold text-danger-foreground disabled:opacity-50"
            disabled={deleting}
            onClick={confirmDeleteAssessment}
            type="button"
          >
            {deleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </InstructorModal>
    </div>
  );
}
