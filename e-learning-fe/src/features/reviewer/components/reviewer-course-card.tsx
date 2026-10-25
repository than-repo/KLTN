"use client";

import Link from "next/link";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/features/auth/hooks/use-auth";
import { ApiError } from "@/lib/api/client";

import { claimReviewerCourse } from "../api/reviewer-api";
import type { ReviewerCourseSummary } from "../types/reviewer";

type ReviewerCourseCardProps = {
  course: ReviewerCourseSummary;
  onClaimed?: () => void;
};

export function ReviewerCourseCard({
  course,
  onClaimed,
}: ReviewerCourseCardProps) {
  const { accessToken } = useAuth();
  const [claiming, setClaiming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleClaim() {
    if (!course.id) return;
    setClaiming(true);
    setError(null);
    try {
      await claimReviewerCourse(course.id, accessToken ?? "");
      onClaimed?.();
    } catch (err) {
      const apiError = err as ApiError;
      setError(apiError.message || "Failed to claim course.");
    } finally {
      setClaiming(false);
    }
  }

  return (
    <article className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex justify-between items-start">
        <Link
          href={`/courses/${course.slug}`}
          className="text-lg font-semibold text-foreground hover:text-primary"
        >
          {course.title || "Untitled course"}
        </Link>
        {course.status && <Badge variant="neutral">{course.status}</Badge>}
      </div>

      {course.shortDescription && (
        <p className="mb-4 line-clamp-2 text-sm text-muted-foreground">
          {course.shortDescription}
        </p>
      )}

      <div className="mb-4 grid gap-1 text-xs text-muted-foreground">
        {course.level && <span>Level: {course.level}</span>}
        {course.language && <span>Language: {course.language}</span>}
        {course.price !== null && course.price !== undefined && (
          <span>
            Price:
            {new Intl.NumberFormat("vi-VN", {
              style: "currency",
              currency: "VND",
            }).format(course.price)}
          </span>
        )}
        <span>
          Categories:{" "}
          {(course.categories ?? []).map((c) => c.name).join(", ") || "None"}
        </span>
        <span>
          Instructors:{" "}
          {(course.instructors ?? []).map((i) => i.fullName).join(", ") ||
            "None"}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          disabled={claiming}
          onClick={handleClaim}
          className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {claiming ? "Claiming..." : "Claim Course"}
        </button>
      </div>

      {error && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {error}
        </div>
      )}
    </article>
  );
}
