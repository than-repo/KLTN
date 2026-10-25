"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button-link";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { ApiError } from "@/lib/api/client";

import {
  getReviewerReviewWorkspace,
  submitReviewerDecision,
} from "../api/reviewer-api";
import type {
  ReviewDecisionStatus,
  ReviewerCourseReviewWorkspace,
} from "../types/reviewer";
import {
  formatReviewerDateTime,
  getReviewerDecisionDescription,
  getReviewerDecisionLabel,
  getReviewerDecisionVariant,
  getReviewerStatusStyle,
} from "../utils/reviewer-format";
import { ReviewerDecisionModal } from "./reviewer-decision-modal";

const variantIconMap: Record<string, string> = {
  success: "✓",
  warning: "↻",
  danger: "✗",
};

const variantClassMap: Record<string, string> = {
  success: "bg-green-100 text-green-700",
  warning: "bg-yellow-100 text-yellow-700",
  danger: "bg-red-100 text-red-700",
};

const buttonClassMap: Record<string, string> = {
  success: "bg-green-600 hover:bg-green-700",
  warning: "bg-yellow-600 hover:bg-yellow-700",
  danger: "bg-red-600 hover:bg-red-700",
};

export function ReviewerWorkspaceContent() {
  const params = useParams<{ reviewId: string }>();
  const router = useRouter();
  const { accessToken, status } = useAuth();
  const reviewId = params.reviewId ?? "";

  const [workspace, setWorkspace] =
    useState<ReviewerCourseReviewWorkspace | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [selectedDecision, setSelectedDecision] =
    useState<ReviewDecisionStatus>("APPROVED");
  const [reviewNote, setReviewNote] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadWorkspace = useCallback(async () => {
    if (!reviewId || reviewId === "undefined") {
      setError("Invalid review task id.");
      return;
    }
    if (status !== "authenticated" || !accessToken) return;

    setError(null);
    try {
      const data = await getReviewerReviewWorkspace(reviewId, accessToken);
      setWorkspace(data as unknown as ReviewerCourseReviewWorkspace);
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || "Failed to load review workspace.");
    }
  }, [reviewId, accessToken, status]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch must update local state on mount
    loadWorkspace();
  }, [loadWorkspace]);
  if (status !== "authenticated") {
    return <div className="text-center py-10">Loading...</div>;
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl px-5 py-10 text-center">
        <div className="rounded-lg border border-red-200 bg-red-50 p-6">
          <h2 className="text-lg font-semibold text-red-900">
            Unable to load review workspace
          </h2>
          <p className="mt-2 text-sm text-red-700">{error}</p>
          <div className="mt-4 flex justify-center">
            <button
              type="button"
              onClick={() => router.push("/reviewer/courses")}
              className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
            >
              Back to My Review Tasks
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!workspace) {
    return null;
  }

  const course = workspace.course;
  const statusClass = getReviewerStatusStyle(workspace.reviewStatus);
  const sections = course.sections ?? [];

  return (
    <section className="mx-auto max-w-[1440px] px-5 py-8 sm:px-8 lg:px-12 lg:py-10">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">
            Review Workspace
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Review course content and submit your decision.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ButtonLink
            href={`/reviewer/courses/${reviewId}/preview`}
            className="hidden sm:inline-flex"
          >
            Preview Course
          </ButtonLink>
          <button
            type="button"
            onClick={() => router.push("/reviewer/courses")}
            className="rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-foreground transition hover:bg-muted"
          >
            Back to My Review Tasks
          </button>
        </div>
      </div>

      <article className="rounded-xl border border-border bg-card p-5 shadow-sm">
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              {course.title || "Untitled course"}
            </h3>
            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
              {course.shortDescription}
            </p>
          </div>
          <span
            className={`px-2 py-0.5 rounded text-xs font-medium ${statusClass}`}
          >
            {workspace.reviewStatus || "PENDING"}
          </span>
        </div>

        <div className="mb-6 grid gap-2 text-xs text-muted-foreground">
          <span>Level: {course.level || "-"}</span>
          <span>Language: {course.language || "-"}</span>
          <span>
            Price:{" "}
            {course.price != null
              ? new Intl.NumberFormat("vi-VN", {
                  style: "currency",
                  currency: "VND",
                }).format(course.price)
              : "-"}
          </span>
          <span>
            Categories:{" "}
            {course.categories.map((c) => c.name).join(", ") || "None"}
          </span>
          <span>
            Instructors:{" "}
            {course.instructors.map((i) => i.fullName).join(", ") || "None"}
          </span>
          <span>
            Submitted at: {formatReviewerDateTime(workspace.submittedAt)}
          </span>
          {workspace.reviewedAt && (
            <span>
              Reviewed at: {formatReviewerDateTime(workspace.reviewedAt)}
            </span>
          )}
        </div>

        <div className="mb-6">
          <h4 className="text-sm font-semibold text-foreground mb-3">
            Curriculum ({sections.length})
          </h4>
          <div className="space-y-3">
            {sections.map((section) => (
              <div
                key={section.id}
                className="rounded-lg border border-border bg-white p-4"
              >
                <div className="flex justify-between items-start mb-2">
                  <h5 className="font-medium text-foreground">
                    {section.title}
                  </h5>
                  <Badge variant="neutral">
                    {section.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                {section.description && (
                  <p className="mb-3 text-xs text-muted-foreground">
                    {section.description}
                  </p>
                )}
                <div className="space-y-2">
                  {section.lessons.map((lesson) => (
                    <div key={lesson.id} className="flex items-start gap-3">
                      <span className="shrink-0 mt-1 text-xs text-muted-foreground">
                        {lesson.lessonIndex + 1}.
                      </span>
                      <div>
                        <p className="text-sm text-foreground">
                          {lesson.title}
                        </p>
                        {lesson.description && (
                          <p className="text-xs text-muted-foreground">
                            {lesson.description}
                          </p>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {lesson.files.length} file
                          {lesson.files.length !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h4 className="text-sm font-semibold text-foreground mb-4">
            Review Decision
          </h4>

          <div className="grid gap-3 md:grid-cols-3">
            {["APPROVED", "CHANGES_REQUESTED", "REJECTED"].map((decision) => {
              const isSelected = selectedDecision === decision;
              const dVariant = getReviewerDecisionVariant(decision);
              return (
                <button
                  key={decision}
                  type="button"
                  onClick={() =>
                    setSelectedDecision(decision as ReviewDecisionStatus)
                  }
                  className={`rounded-xl border p-4 text-sm transition ${isSelected ? "bg-primary text-primary-foreground border-primary shadow-sm" : "bg-white border-border text-zinc-700 hover:bg-muted"}`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span
                      className={`text-xs font-bold ${variantClassMap[dVariant] ?? variantClassMap.success}`}
                    >
                      {variantIconMap[dVariant] ?? variantIconMap.success}
                    </span>
                    <span className="font-semibold">
                      {getReviewerDecisionLabel(decision)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {getReviewerDecisionDescription(decision)}
                  </p>
                </button>
              );
            })}
          </div>

          <div className="mt-6">
            <label className="block text-xs font-semibold uppercase text-zinc-500 mb-2">
              Review Note
            </label>
            <textarea
              value={reviewNote}
              onChange={(e) => setReviewNote(e.target.value)}
              placeholder="Enter your review note..."
              rows={5}
              className="w-full rounded-lg border border-border bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
            {selectedDecision === "REJECTED" && (
              <p className="mt-2 text-xs text-red-700">
                A clear note is required when rejecting a course.
              </p>
            )}
          </div>
        </div>
      </article>

      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={() => setConfirmOpen(true)}
          disabled={submitting}
          className={`rounded-lg px-5 py-2.5 text-sm font-semibold text-white transition disabled:opacity-60 disabled:cursor-not-allowed ${buttonClassMap[getReviewerDecisionVariant(selectedDecision)] ?? buttonClassMap.success}`}
        >
          Submit {getReviewerDecisionLabel(selectedDecision)}
        </button>
      </div>

      <ReviewerDecisionModal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        decision={selectedDecision}
        note={reviewNote}
        submitting={submitting}
        onConfirm={async () => {
          if (!reviewId) return;
          setSubmitting(true);
          try {
            await submitReviewerDecision(
              reviewId,
              { decision: selectedDecision, note: reviewNote },
              accessToken ?? "",
            );
            router.push("/reviewer/courses");
          } catch (err) {
            const apiError = err as ApiError;
            setError(apiError.message || "Failed to submit review decision.");
            setSubmitting(false);
          }
        }}
      />
    </section>
  );
}
