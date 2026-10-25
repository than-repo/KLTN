"use client";

import Link from "next/link";

import { ButtonLink } from "@/components/ui/button-link";

import type { ReviewerCourseTask } from "../types/reviewer";
import {
  formatReviewerDateTime,
  getReviewerStatusStyle,
} from "../utils/reviewer-format";

type ReviewerTaskCardProps = {
  task: ReviewerCourseTask;
};

export function ReviewerTaskCard({ task }: ReviewerTaskCardProps) {
  const course = task.course;
  const statusClass = getReviewerStatusStyle(task.reviewStatus);

  return (
    <article className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex justify-between items-start">
        <Link
          href={`/courses/${course.slug}`}
          className="text-lg font-semibold text-foreground hover:text-primary"
        >
          {course.title || "Untitled course"}
        </Link>
        <span
          className={`px-2 py-0.5 rounded text-xs font-medium ${statusClass}`}
        >
          {task.reviewStatus || "PENDING"}
        </span>
      </div>

      {course.shortDescription && (
        <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">
          {course.shortDescription}
        </p>
      )}

      <div className="mb-4 grid gap-1 text-xs text-muted-foreground">
        <span>Level: {course.level || "-"}</span>
        <span>Language: {course.language || "-"}</span>
        <span>
          Categories:{" "}
          {(course.categories ?? []).map((c) => c.name).join(", ") || "None"}
        </span>
        <span>
          Instructors:{" "}
          {(course.instructors ?? []).map((i) => i.fullName).join(", ") ||
            "None"}
        </span>
        <span>Submitted at: {formatReviewerDateTime(task.submittedAt)}</span>
        {task.reviewedAt && (
          <span>Reviewed at: {formatReviewerDateTime(task.reviewedAt)}</span>
        )}
      </div>

      <div className="mt-4 flex items-center gap-2">
        <ButtonLink
          href={`/reviewer/courses/${task.reviewId}`}
          className="flex-1"
        >
          Open Review
        </ButtonLink>
      </div>
    </article>
  );
}
