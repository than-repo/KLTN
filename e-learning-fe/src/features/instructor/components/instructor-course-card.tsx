"use client";

import Link from "next/link";

import { Badge } from "@/components/ui/badge";

import type {
  InstructorCourse,
  InstructorCourseLatestReview,
} from "../types/instructor-course";
import {
  canDeleteCourse,
  formatCourseStatusLabel,
  formatLevelLabel,
  getCourseStatusBadgeVariant,
  getDeleteDisabledReason,
  normalizeCourseStatus,
  shouldHighlightReview,
} from "../utils/course-status";
import { formatDateTime } from "../utils/instructor-format";

type InstructorCourseCardProps = {
  course: InstructorCourse;
  highlightReview: boolean;
  latestReviewByCourse: Record<string, InstructorCourseLatestReview>;
  onDelete: (course: InstructorCourse) => void;
  onSubmitForReview: (course: InstructorCourse) => void;
  onViewReview: (course: InstructorCourse) => void;
  submittingCourseId: string | null;
};

export function InstructorCourseCard({
  course,
  highlightReview,
  latestReviewByCourse,
  onDelete,
  onSubmitForReview,
  onViewReview,
  submittingCourseId,
}: InstructorCourseCardProps) {
  const latestReview = latestReviewByCourse[course.id];
  const statusVariant = getCourseStatusBadgeVariant(course.status);
  const highlighted = highlightReview || shouldHighlightReview(course);
  const deleteAllowed = canDeleteCourse(course);
  const deleteReason = getDeleteDisabledReason(course);
  const isSubmitting = submittingCourseId === course.id;

  return (
    <article
      className={`flex h-full flex-col rounded-lg border bg-card p-5 shadow-sm ${
        highlighted ? "border-warning/60" : "border-border"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          <Badge variant={statusVariant}>
            {formatCourseStatusLabel(course.status)}
          </Badge>
          <Badge>{formatLevelLabel(course.level)}</Badge>
          {course.language ? <Badge>{course.language}</Badge> : null}
          {course.categories?.map((category) => (
            <Badge key={category.id}>{category.name}</Badge>
          ))}
        </div>

        <span className="text-sm font-semibold">
          {course.price !== undefined && course.price !== null
            ? `${Number(course.price).toLocaleString("vi-VN")} VND`
            : "Free"}
        </span>
      </div>

      <h2 className="mt-4 line-clamp-2 text-lg font-semibold leading-snug">
        {course.title}
      </h2>
      <p className="mt-3 line-clamp-2 text-sm leading-6 text-muted-foreground">
        {course.shortDescription}
      </p>

      <p className="mt-4 text-xs text-muted-foreground">
        Updated {formatDateTime(course.updatedAt ?? course.createdAt)}
      </p>

      {highlighted ? (
        <div className="mt-4 rounded-md border border-warning/40 bg-warning/10 p-3 text-sm leading-6 text-warning">
          Reviewer requested changes.
          {latestReview ? (
            <button
              className="ml-1 font-semibold underline"
              onClick={() => onViewReview(course)}
              type="button"
            >
              View feedback
            </button>
          ) : null}
        </div>
      ) : latestReview &&
        normalizeCourseStatus(latestReview.reviewStatus) === "APPROVED" ? (
        <div className="mt-4 rounded-md border border-success/40 bg-success/10 p-3 text-sm leading-6 text-success">
          Reviewer approved the course.
        </div>
      ) : null}

      <dl className="mt-5 grid gap-2 border-t border-border pt-4 text-sm text-muted-foreground">
        <div className="flex items-center justify-between gap-3">
          <dt>Categories</dt>
          <dd className="text-right text-foreground">
            {course.categories?.length
              ? course.categories.map((item) => item.name).join(", ")
              : "-"}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-3">
          <dt>Certificate</dt>
          <dd className="text-right text-foreground">
            {course.certificateEnabled ? "Enabled" : "Disabled"}
          </dd>
        </div>
      </dl>

      <div className="mt-5 flex flex-wrap gap-2">
        <CardAction href={`/instructor/courses/${course.id}/edit`}>
          Edit
        </CardAction>
        <CardAction href={`/instructor/courses/${course.id}/curriculum`}>
          Curriculum
        </CardAction>
        <CardAction href={`/instructor/courses/${course.id}/assessments`}>
          Assessments
        </CardAction>
        <CardAction href={`/instructor/courses/${course.id}/preview`}>
          Preview
        </CardAction>
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-5">
        {deleteAllowed ? (
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-danger bg-danger px-5 text-sm font-semibold text-danger-foreground transition-colors hover:bg-danger/90"
            onClick={() => onDelete(course)}
            type="button"
          >
            Delete Draft
          </button>
        ) : (
          <button
            className="inline-flex min-h-11 cursor-not-allowed items-center justify-center rounded-md border border-border bg-muted px-5 text-sm font-semibold text-muted-foreground"
            disabled
            title={deleteReason}
            type="button"
          >
            Delete Draft
          </button>
        )}

        {canSubmitForReviewStatus(course.status) ? (
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-primary bg-primary px-5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-focus disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            onClick={() => onSubmitForReview(course)}
            type="button"
          >
            {isSubmitting ? "Submitting..." : "Submit for Review"}
          </button>
        ) : null}
      </div>
    </article>
  );
}

function canSubmitForReviewStatus(status?: string) {
  const normalizedStatus = normalizeCourseStatus(status);

  if (!normalizedStatus) return true;

  return [
    "DRAFT",
    "CHANGES_REQUESTED",
    "REJECTED",
    "NEEDS_CHANGES",
    "NEEDS_REVISION",
    "REVISION_REQUIRED",
  ].includes(normalizedStatus);
}

function CardAction({ children, href }: { children: string; href: string }) {
  return (
    <Link
      className="inline-flex min-h-9 items-center justify-center rounded-md border border-border bg-surface-pearl px-4 text-sm font-semibold text-foreground transition-colors hover:border-primary hover:text-primary"
      href={href}
    >
      {children}
    </Link>
  );
}
